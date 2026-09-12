import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";

export const teamRouter = Router();
teamRouter.use(requireAuth);

function serializeTeam(team: InstanceType<typeof Team>) {
  return {
    id: String(team._id),
    name: team.name,
    owner_id: String(team.ownerId),
    members: team.members.map((m) => ({ user_id: String(m.userId), role: m.role, joined_at: m.joinedAt })),
    credits_remaining: team.creditsRemaining,
    credits_allowance: team.creditsAllowance,
    credits_reset_at: team.creditsResetAt,
    pending_invites: team.invites.map((i) => ({
      token: i.token,
      email: i.email,
      expires_at: i.expiresAt,
    })),
  };
}

/** Teams the current user belongs to (owner or member). */
teamRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const teams = await Team.find({ "members.userId": req.userId });
    res.json(teams.map(serializeTeam));
  }),
);

const createTeamSchema = z.object({ name: z.string().trim().min(2).max(80) });

teamRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name } = createTeamSchema.parse(req.body);
    const team = await Team.create({
      name,
      ownerId: req.userId,
      members: [{ userId: req.userId, role: "owner" }],
    });
    await User.findByIdAndUpdate(req.userId, { teamId: team._id });
    res.status(201).json(serializeTeam(team));
  }),
);

teamRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const team = await Team.findOne({ _id: req.params["id"], "members.userId": req.userId });
    if (!team) throw new HttpError(404, "Team not found");
    res.json(serializeTeam(team));
  }),
);

const inviteSchema = z.object({ email: z.string().email().optional() });

teamRouter.post(
  "/:id/invite",
  asyncHandler(async (req, res) => {
    const { email } = inviteSchema.parse(req.body ?? {});
    const team = await Team.findOne({ _id: req.params["id"], ownerId: req.userId });
    if (!team) throw new HttpError(404, "Team not found, or you're not the owner");

    const token = nanoid(24);
    team.invites.push({
      token,
      email: email ?? null,
      role: "member",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await team.save();

    // No SMTP configured by default — return the shareable link. Wire up
    // nodemailer here if you want the invite emailed automatically.
    res.status(201).json({
      inviteUrl: `${env.frontendUrl}/team/join/${token}`,
      token,
      expiresAt: team.invites[team.invites.length - 1]!.expiresAt,
    });
  }),
);

teamRouter.post(
  "/join/:token",
  asyncHandler(async (req, res) => {
    const team = await Team.findOne({ "invites.token": req.params["token"] });
    if (!team) throw new HttpError(404, "Invite not found or expired");

    const invite = team.invites.find((i) => i.token === req.params["token"]);
    if (!invite || invite.expiresAt.getTime() < Date.now()) {
      throw new HttpError(410, "This invite has expired");
    }

    if (!team.members.some((m) => String(m.userId) === req.userId)) {
      team.members.push({
        userId: new Types.ObjectId(req.userId),
        role: "member",
        joinedAt: new Date(),
      });
    }
    const inviteIdx = team.invites.findIndex((i) => i.token === req.params["token"]);
    if (inviteIdx !== -1) team.invites.splice(inviteIdx, 1);
    await team.save();
    await User.findByIdAndUpdate(req.userId, { teamId: team._id });

    res.json(serializeTeam(team));
  }),
);

teamRouter.post(
  "/:id/leave",
  asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params["id"]);
    if (!team) throw new HttpError(404, "Team not found");
    if (String(team.ownerId) === req.userId) {
      throw new HttpError(400, "Owner can't leave — delete the team or transfer ownership instead");
    }
    const memberIdx = team.members.findIndex((m) => String(m.userId) === req.userId);
    if (memberIdx !== -1) team.members.splice(memberIdx, 1);
    await team.save();
    await User.findByIdAndUpdate(req.userId, { teamId: null });
    res.json({ ok: true });
  }),
);
