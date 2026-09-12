import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { User } from "../models/User.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { authCookie, signToken } from "../utils/jwt.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { env, isGoogleOAuthConfigured } from "../config/env.js";
import { buildGoogleAuthUrl, exchangeGoogleCode } from "../services/google.service.js";

export const authRouter = Router();

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(200),
  fullName: z.string().trim().min(1).max(120).optional(),
});
const signInSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function publicUser(user: {
  _id: unknown;
  email: string;
  fullName: string;
  plan: string;
  creditsRemaining: number;
  creditsAllowance: number;
  creditsResetAt: Date;
  teamId?: unknown;
}) {
  return {
    id: String(user._id),
    email: user.email,
    full_name: user.fullName,
    plan: user.plan,
    credits_remaining: user.creditsRemaining,
    credits_allowance: user.creditsAllowance,
    credits_reset_at: user.creditsResetAt,
    team_id: user.teamId ? String(user.teamId) : null,
  };
}

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const input = signUpSchema.parse(req.body);
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) throw new HttpError(409, "An account with this email already exists");

    const user = await User.create({
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      fullName: input.fullName ?? input.email.split("@")[0],
    });

    res.cookie(authCookie.name, signToken(String(user._id)), authCookie.options);
    res.status(201).json(publicUser(user));
  }),
);

authRouter.post(
  "/signin",
  asyncHandler(async (req, res) => {
    const input = signInSchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user?.passwordHash) throw new HttpError(401, "Invalid email or password");

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    res.cookie(authCookie.name, signToken(String(user._id)), authCookie.options);
    res.json(publicUser(user));
  }),
);

authRouter.post("/signout", (_req, res) => {
  res.clearCookie(authCookie.name, { path: "/" });
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(401, "Not authenticated");
    res.json(publicUser(user));
  }),
);

// ── Google OAuth (redirect flow, no client-side SDK) ──

const pendingStates = new Set<string>();

authRouter.get("/google", (_req, res) => {
  if (!isGoogleOAuthConfigured) {
    return res
      .status(503)
      .send("Google sign-in is not configured on the server. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.");
  }
  const state = nanoid();
  pendingStates.add(state);
  res.redirect(buildGoogleAuthUrl(state));
});

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query["code"] ?? "");
    const state = String(req.query["state"] ?? "");
    if (!code || !state || !pendingStates.has(state)) {
      return res.redirect(`${env.frontendUrl}/auth?error=google_oauth_failed`);
    }
    pendingStates.delete(state);

    const profile = await exchangeGoogleCode(code);
    let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });

    if (!user) {
      user = await User.create({
        email: profile.email,
        googleId: profile.googleId,
        fullName: profile.fullName,
      });
    } else if (!user.googleId) {
      user.googleId = profile.googleId;
      await user.save();
    }

    res.cookie(authCookie.name, signToken(String(user._id)), authCookie.options);
    res.redirect(`${env.frontendUrl}/dashboard`);
  }),
);
