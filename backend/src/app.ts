import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { env } from "./config/env.js";
import { isMongoConnected } from "./db.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { authRouter } from "./routes/auth.routes.js";
import { leadsRouter } from "./routes/leads.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { creditsRouter } from "./routes/credits.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { qualityRouter } from "./routes/quality.routes.js";
import { teamRouter } from "./routes/team.routes.js";
import { creditPacks } from "./data/creditPacks.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.frontendUrl.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  // Webhook needs the raw request body for signature verification, so it's
  // mounted BEFORE the global express.json() body parser.
  app.use("/api/webhooks", webhookRouter);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true });
  app.use("/api/auth/signup", authLimiter);
  app.use("/api/auth/signin", authLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, mongo: isMongoConnected() ? "connected" : "disconnected" });
  });

  app.get("/api/credit-packs", (_req, res) => res.json(creditPacks));

  app.use("/api/auth", authRouter);
  app.use("/api/leads", leadsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/credits", creditsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/quality", qualityRouter);
  app.use("/api/teams", teamRouter);

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  // Optional single-service deploy: if the frontend's built `dist/` is
  // present (see FRONTEND_DIST_PATH / the default location one level up
  // from this repo's backend/), serve it as static files and fall back to
  // index.html for client-side routes. Two-service deploys (frontend and
  // backend on separate hosts) simply won't find this folder and skip it —
  // nothing here is required for that setup.
  const distPath = resolveFrontendDist();
  if (distPath) {
    console.log(`[static] serving frontend build from ${distPath}`);
    app.use(express.static(distPath));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}

function resolveFrontendDist(): string | null {
  const configured = process.env["FRONTEND_DIST_PATH"];
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    configured,
    path.resolve(currentDir, "../../dist"), // repo-root/dist, when backend/ sits inside the monorepo
    path.resolve(currentDir, "../public"), // backend/public, if you copy the build in yourself
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) return candidate;
  }
  return null;
}
