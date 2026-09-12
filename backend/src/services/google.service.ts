import { OAuth2Client } from "google-auth-library";
import { env, isGoogleOAuthConfigured } from "../config/env.js";

export class GoogleOAuthNotConfiguredError extends Error {
  constructor() {
    super("Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    this.name = "GoogleOAuthNotConfiguredError";
  }
}

const redirectUri = `${env.backendUrl}/api/auth/google/callback`;

function client(): OAuth2Client {
  if (!isGoogleOAuthConfigured) throw new GoogleOAuthNotConfiguredError();
  return new OAuth2Client(env.googleClientId, env.googleClientSecret, redirectUri);
}

export function buildGoogleAuthUrl(state: string): string {
  return client().generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });
}

export async function exchangeGoogleCode(
  code: string,
): Promise<{ email: string; fullName: string; googleId: string }> {
  const oAuth2Client = client();
  const { tokens } = await oAuth2Client.getToken(code);
  if (!tokens.id_token) throw new Error("Google did not return an id_token");

  const ticket = await oAuth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) throw new Error("Google profile missing email/sub");

  return {
    email: payload.email,
    fullName: payload.name ?? payload.email.split("@")[0] ?? "",
    googleId: payload.sub,
  };
}
