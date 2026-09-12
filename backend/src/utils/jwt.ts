import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type JwtPayload = { sub: string };

const COOKIE_NAME = "lf_token";
const EXPIRES_IN = "30d";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies JwtPayload, env.jwtSecret, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

export const authCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.nodeEnv === "production",
    maxAge: MAX_AGE_MS,
    path: "/",
  },
};
