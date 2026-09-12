import { createApp } from "./app.js";
import { connectMongo } from "./db.js";
import { env } from "./config/env.js";
import dns from "dns";

dns.setServers(["8.8.8.8"]);

const app = createApp();

// Connect in the background — the server starts listening immediately so
// /api/health always responds, even while MongoDB is still (re)connecting.
void connectMongo();

app.listen(env.port, () => {
  console.log(`[leadfinder-backend] listening on http://localhost:${env.port} (${env.nodeEnv})`);
});
