import mongoose from "mongoose";
import { env } from "./config/env.js";

let connecting: Promise<void> | null = null;

/**
 * Connects to MongoDB. Never throws past this function — if the database is
 * unreachable we log it and retry in the background so the HTTP server can
 * still boot and serve /api/health, instead of crashing the whole process.
 */
export function connectMongo(): Promise<void> {
  if (connecting) return connecting;

  connecting = new Promise<void>((resolve) => {
    mongoose.set("strictQuery", true);

    async function attempt() {
      try {
        await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 8000 });
        console.log("✅ Connected to MongoDB");
        resolve();
      } catch (error) {
        console.error(
          `[mongo] connection failed (${redact(env.mongodbUri)}): ${(error as Error).message}`,
        );
        console.error("[mongo] retrying in 5s — the API will 503 on DB routes until connected.");
        setTimeout(attempt, 5000);
      }
    }

    attempt();
  });

  return connecting;
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function redact(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
}
