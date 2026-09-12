# LeadFinder

Find, score, and export local business leads — with per-user search/download
history, a credits system, Razorpay billing, and AI-assisted lead research.

This repo was originally a **Lovable Cloud** project (TanStack Start SSR +
Lovable-managed Supabase auth/DB/hosting). It has been fully rewritten to
remove Lovable/Supabase entirely:

- **`backend/`** — a standalone **Node.js + Express + MongoDB** API you host
  yourself, with its own auth (email/password + Google OAuth), Razorpay
  payments, and all business logic.
- **`/` (this folder)** — a plain **Vite + React SPA** (no SSR, no Lovable
  build plugin) that talks to `backend/` over a JSON REST API.

Nothing in this codebase talks to Supabase, Lovable Cloud, or any Lovable
package anymore. Every request goes to the Express API in `backend/`.

---

## Architecture

```
┌─────────────────────┐   REST/JSON, cookie session   ┌──────────────────────┐
│   Frontend (Vite)    │ ─────────────────────────────▶│  Backend (Express)   │
│   React + TanStack   │ ◀─────────────────────────────│  Node + Mongoose     │
│   Router + Query     │                                └───────────┬──────────┘
└─────────────────────┘                                             │
                              ┌──────────────────────────────────────┼───────────────────────┐
                              ▼                                      ▼                        ▼
                        ┌───────────┐                        ┌───────────────┐        ┌──────────────┐
                        │ MongoDB   │                        │ Razorpay API   │        │ Google APIs  │
                        │ (Atlas or │                        │ (orders,       │        │ (OAuth,      │
                        │  self-    │                        │  webhooks)     │        │  Places)     │
                        │  hosted)  │                        └───────────────┘        └──────────────┘
                        └───────────┘
                                                                     │
                                                                     ▼
                                                            ┌────────────────┐
                                                            │ Anthropic API  │
                                                            │ (AI analysis / │
                                                            │  outreach)     │
                                                            └────────────────┘
```

In dev, Vite proxies `/api/*` to the backend (see `vite.config.ts`), so the
browser never needs CORS. In production, deploy the backend anywhere that
runs Node, and either serve the frontend's static `dist/` from the same
domain (via a reverse proxy) or from a CDN with `/api/*` rewritten to the
backend — either way, no code changes are needed.

---

## What changed from the Lovable version

| Area | Before (Lovable Cloud) | Now |
|---|---|---|
| Hosting/build | TanStack Start SSR, `nitro` → Cloudflare Workers, `@lovable.dev/vite-tanstack-config` | Plain Vite SPA, deployable anywhere static files are served |
| Auth | Lovable-managed Supabase auth (`@lovable.dev/cloud-auth-js`) | Self-hosted JWT-in-httpOnly-cookie sessions; email/password (bcrypt) + real Google OAuth (`google-auth-library`) |
| Database | Lovable-managed Supabase Postgres, RLS policies | Self-hosted MongoDB (Mongoose), per-user scoping enforced in Express middleware/route handlers |
| Server logic | TanStack Start server functions (`*.server.ts`, `*.functions.ts`) | Standalone Express routes in `backend/src/routes` |
| Payments | Razorpay, called from TanStack Start server functions | Razorpay, called from Express routes — same logic, same signature verification, now in `backend/src/services/razorpay.service.ts` |
| Google Places | Called through Lovable's connector gateway | Called directly against `places.googleapis.com` with your own `GOOGLE_MAPS_API_KEY` |
| Error reporting | `lovable-error-reporting.ts` (posted to Lovable's dashboard) | Removed — plug in your own (Sentry, etc.) if desired |
| Charting lib | recharts 2.x (deprecated) | recharts 3.x |
| Lint tooling | eslint 9.39.5 (flagged unsupported) | eslint 9.32+ current line, prettier integration unchanged |

### Phase 2 (new)

- **AI lead analysis** — `POST /api/ai/leads/:id/analyze` calls the Anthropic
  API and stores a structured opportunity summary, pain points, and talking
  points on the lead.
- **AI outreach drafts** — `POST /api/ai/leads/:id/outreach` generates an
  email + SMS draft personalized to the lead.
- **Website quality check** — `POST /api/quality/leads/:id/website` fetches
  the lead's site and scores it on reachability, HTTPS, title/meta
  description, and mobile viewport tag. No external API key needed.
- **Social presence check** — `POST /api/quality/leads/:id/social` scans the
  lead's website HTML for Facebook/Instagram/Twitter (X)/LinkedIn/YouTube
  links. No external API key needed.
- **Team accounts** — create a team, invite teammates via a shareable link,
  and share one pooled monthly credit balance for searches. See `/team` in
  the app and `backend/src/routes/team.routes.ts`.

All four are reachable from the app: click the sparkle icon on any lead row
(Find Leads / My Leads / Search History) to open the insights panel.

---

## Project layout

```
.
├── src/                    # Frontend SPA
│   ├── routes/              # File-based routes (TanStack Router)
│   │   ├── _authenticated/  # Everything requiring a session (pathless layout)
│   │   ├── auth.tsx
│   │   └── index.tsx        # Landing page
│   ├── components/          # UI components (shadcn/ui + app-specific)
│   ├── lib/
│   │   ├── api-client.ts    # All calls to the backend REST API live here
│   │   ├── credit-packs.ts
│   │   ├── csv.ts
│   │   └── leads.schemas.ts
│   └── main.tsx              # SPA entry point (React root, router, query client)
├── index.html
├── vite.config.ts
│
└── backend/                 # Standalone Node/Express/MongoDB API
    ├── src/
    │   ├── server.ts         # Entry point
    │   ├── app.ts             # Express app + middleware + route mounting
    │   ├── db.ts               # MongoDB connection (retries in the background)
    │   ├── config/env.ts        # Env var loading/validation
    │   ├── models/               # Mongoose schemas
    │   ├── routes/                 # auth, leads, dashboard, credits, payments,
    │   │                            webhooks, ai, quality, teams
    │   ├── services/                 # Razorpay, Google Places, scraper fallback
    │   │                              chain, lead scoring, AI, website/social checks
    │   ├── middleware/                 # requireAuth (JWT cookie), error handler
    │   └── utils/                        # jwt, password hashing, credit spend/add
    └── package.json
```

---

## FastAPI lead source

This repository now includes `fastapi/`, a standalone FastAPI service that matches the
existing Express `LEADS_API_URL` contract. It uses Google Places API (New) Text Search
as the lead source, returns the fields expected by `backend/src/services/scraper.service.ts`,
and protects the endpoint with `LEADS_API_KEY`.

For production, deploy `fastapi/` separately and set these two Express variables:

```text
LEADS_API_URL=https://YOUR-FASTAPI-DOMAIN/search
LEADS_API_KEY=<same secret configured in FastAPI>
```

The FastAPI service itself needs:

```text
LEADS_API_KEY=<same secret configured in Express>
GOOGLE_MAPS_API_KEY=<Google Places API key>
```

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
```

Fill in `.env`:

| Variable | Required? | Notes |
|---|---|---|
| `MONGODB_URI` | **Yes** | MongoDB Atlas free tier works fine, or self-hosted MongoDB. |
| `JWT_SECRET` | **Yes** | Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FRONTEND_URL` / `BACKEND_URL` | Yes | Used for CORS and building OAuth/webhook redirect URLs. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google sign-in | From Google Cloud Console → Credentials. Redirect URI to register: `{BACKEND_URL}/api/auth/google/callback`. Without these, email/password auth still works fine. |
| `LEADS_API_URL` (+ `LEADS_API_KEY`) | Optional | Point this at your own FastAPI/scraping service to take searches out of demo mode. |
| `GOOGLE_MAPS_API_KEY` | Optional | Used only if `LEADS_API_URL` is unset — calls Google Places API (New) directly. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | For live payments | From the Razorpay dashboard. Without these, the credits page shows "payments not configured" instead of erroring. |
| `ANTHROPIC_API_KEY` (+ `AI_MODEL`) | For Phase 2 AI features | Without this, AI analysis/outreach buttons return a clear "not configured" error; everything else still works. |

Run it:

```bash
npm run dev      # tsx watch, hot reload
# or
npm run build && npm start
```

The server boots and serves `/api/health` immediately even if MongoDB isn't
reachable yet — it retries the connection in the background and logs a clear
warning. DB-backed routes will 500 until the connection succeeds; this is
intentional so the process never crash-loops on a slow DB.

### 2. Frontend

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`. In dev, requests to `/api/*` are proxied to
`http://localhost:4000` (the backend) automatically — see `vite.config.ts`.
If your backend runs elsewhere, set `VITE_API_PROXY_TARGET`.

### 3. Razorpay webhook (for production)

Point a Razorpay webhook at `{BACKEND_URL}/api/webhooks/razorpay` for the
`payment.captured` event, and put the webhook's signing secret in
`RAZORPAY_WEBHOOK_SECRET`. This is a safety net — normal checkouts are
already fulfilled synchronously via `POST /api/payments/verify` — but the
webhook guarantees credits still land if the browser closes before that
call completes.

---

## Deployment

The frontend calls relative `/api/...` paths (see `src/lib/api-client.ts`),
so in production the frontend and backend need to share an origin — either
by serving both from one process, or by proxying `/api/*` on the frontend's
domain to the backend. Two supported patterns:

### Pattern A — single service (recommended, simplest)

The backend auto-detects a built frontend and serves it as static files,
falling back to `index.html` for client-side routes (see
`resolveFrontendDist()` in `backend/src/app.ts`). One process, one host, no
CORS or rewrite rules to configure.

```bash
npm install && npm run build        # builds the frontend to ./dist
cd backend && npm install && npm run build
npm start                            # serves API + frontend on the same port
```

Deploy this as a single Node service (Render, Railway, Fly.io, a VPS, etc.):
root directory of the service is the repo root, build command runs both
builds above, start command is `node backend/dist/server.js`.

### Pattern B — two services

Deploy the backend as its own Node service, and the frontend as static
files on a CDN/static host (Vercel, Netlify, Cloudflare Pages). You'll need
a rewrite rule so `/api/*` on the frontend's domain forwards to the backend
service, and `FRONTEND_URL`/CORS on the backend must match the frontend's
real domain.

### Production environment variables

The frontend has no secret runtime variables. Keep `VITE_API_PROXY_TARGET` only
for local Vite development. In production, route `/api/*` on the frontend
domain to the backend so the browser can use the relative API URLs.

Set these variables on the Node backend:

```text
NODE_ENV=production
PORT=<platform-provided-port, if required>
FRONTEND_URL=https://app.example.com
BACKEND_URL=https://api.example.com
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/leadfinder?retryWrites=true&w=majority
JWT_SECRET=<long-random-secret>
LEADS_API_URL=https://leads-api.example.com/search
LEADS_API_KEY=<shared-secret-with-fastapi>
GOOGLE_MAPS_API_KEY=<optional-fallback-if-not-using-fastapi>
GOOGLE_CLIENT_ID=<optional-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<optional-google-oauth-client-secret>
RAZORPAY_KEY_ID=<required-for-live-payments>
RAZORPAY_KEY_SECRET=<required-for-live-payments>
RAZORPAY_WEBHOOK_SECRET=<required-for-razorpay-webhook>
ANTHROPIC_API_KEY=<optional-ai-features>
AI_MODEL=claude-sonnet-5
```

Set these variables on the FastAPI lead-source service:

```text
LEADS_API_KEY=<same-shared-secret-as-node-backend>
SERPAPI_API_KEY=<serpapi-key>
MAX_RESULTS=100
```

When Google OAuth is enabled, register
`https://api.example.com/api/auth/google/callback` in Google Cloud. Configure
the Razorpay webhook as `https://api.example.com/api/webhooks/razorpay`.

## Verification performed

- **Backend**: `npm run typecheck` and `npm run build` both pass with zero
  errors. The compiled server boots and correctly serves `/api/health` and
  `/api/credit-packs` (no DB required); DB-backed routes fail gracefully
  (clear timeout, not a crash) when MongoDB isn't reachable, which is what
  happens in this development sandbox (no outbound access to a real MongoDB
  instance). Point `MONGODB_URI` at a real MongoDB Atlas cluster to exercise
  the DB-backed routes.
- **Frontend**: `npm run build` (`tsc --noEmit && vite build`) passes with
  zero errors. `npx eslint .` passes with zero errors (only pre-existing
  informational warnings on shadcn/ui boilerplate files, unrelated to this
  rewrite). All routes (`/`, `/auth`, `/dashboard`, `/find-leads`,
  `/history`, `/my-leads`, `/credits`, `/team`) were confirmed to return
  `200` from both `vite dev` and `vite preview`.
- **Integration**: backend and frontend were run together; the dev proxy
  was confirmed to correctly forward `/api/*` from the frontend origin to
  the Express server, including cookies, CORS, and rate-limiting headers.

## Known limitations / what's not done

- **Phase-2 scope**: AI lead analysis, AI outreach drafts, website quality
  checks, social presence checks, and team accounts are implemented as
  described above. Anything beyond that (e.g. billing for teams
  specifically, email delivery of invites, more advanced lead enrichment)
  was intentionally left out to keep this a coherent, working v1 rather
  than a half-built v2.
- **No SMTP configured** — team invites return a shareable link rather than
  sending an email. Wire up `nodemailer` in
  `backend/src/routes/team.routes.ts` if you want that.
- **No automated test suite** — this rewrite was verified via typecheck,
  build, and manual route/integration smoke tests (see above), not unit or
  e2e tests. Adding a test suite (e.g. Vitest + Supertest for the backend)
  would be a reasonable next step.
