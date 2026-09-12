import type { NextFunction, Request, Response } from "express";
import { authCookie, verifyToken } from "../utils/jwt.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[authCookie.name];
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: "Not authenticated" });

  req.userId = payload.sub;
  // Optional per-request "act as team" context, set by the frontend when the
  // user has an active team selected (used for shared credits / shared leads).
  const teamHeader = req.header("x-team-id");
  req.teamId = teamHeader && teamHeader.trim() ? teamHeader.trim() : null;
  next();
}

/** Same as requireAuth but never rejects — used for routes that behave
 * differently when logged in vs anonymous (currently unused, kept for clarity). */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[authCookie.name];
  const payload = token ? verifyToken(token) : null;
  if (payload) req.userId = payload.sub;
  next();
}
