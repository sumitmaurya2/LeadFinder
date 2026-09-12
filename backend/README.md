# LeadFinder Backend

smartpings

Standalone Node.js + Express + MongoDB API. No Supabase, no Lovable Cloud —
this is a plain backend you host yourself (Railway, Render, Fly.io, a VPS,
etc.) alongside a MongoDB instance (Atlas free tier is fine).

See the root `README.md` for the full-stack overview. This file covers just
this folder.

## Quick start

```bash
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET at minimum
npm install
npm run dev             # tsx watch, http://localhost:4000
```

## Scripts

- `npm run dev` — hot-reloading dev server (tsx)
- `npm run build` — compiles TypeScript to `dist/`
- `npm start` — runs the compiled server (`node dist/server.js`)
- `npm run typecheck` — `tsc --noEmit`

## Routes

All routes are prefixed with `/api`.

| Method | Path                           | Auth?              | Purpose                                          |
| ------ | ------------------------------ | ------------------ | ------------------------------------------------ |
| GET    | `/health`                    | No                 | Liveness + Mongo connection status               |
| GET    | `/credit-packs`              | No                 | Public list of purchasable credit packs          |
| POST   | `/auth/signup`               | No                 | Email/password signup                            |
| POST   | `/auth/signin`               | No                 | Email/password login                             |
| POST   | `/auth/signout`              | No                 | Clears the session cookie                        |
| GET    | `/auth/me`                   | Yes                | Current user profile                             |
| GET    | `/auth/google`               | No                 | Redirects to Google's consent screen             |
| GET    | `/auth/google/callback`      | No                 | OAuth callback, sets session cookie              |
| POST   | `/leads/search`              | Yes                | Runs a lead search, spends 1 credit              |
| GET    | `/leads/saved`               | Yes                | Saved/bookmarked leads                           |
| PATCH  | `/leads/save`                | Yes                | Save/unsave leads by id                          |
| GET    | `/leads/history`             | Yes                | Past searches                                    |
| GET    | `/leads/history/:id/leads`   | Yes                | Leads from one search                            |
| DELETE | `/leads/history/:id`         | Yes                | Delete a search + its leads                      |
| GET    | `/leads/:id`                 | Yes                | Single lead                                      |
| GET    | `/dashboard`                 | Yes                | Aggregate counts for the dashboard               |
| GET    | `/credits/transactions`      | Yes                | Credit ledger                                    |
| GET    | `/payments/configured`       | Yes                | Whether Razorpay is set up                       |
| POST   | `/payments/create-order`     | Yes                | Creates a Razorpay order                         |
| POST   | `/payments/verify`           | Yes                | Verifies checkout signature, credits the account |
| GET    | `/payments`                  | Yes                | Payment history                                  |
| POST   | `/webhooks/razorpay`         | No (HMAC-verified) | Razorpay webhook fallback                        |
| GET    | `/ai/configured`             | Yes                | Whether`ANTHROPIC_API_KEY` is set              |
| POST   | `/ai/leads/:id/analyze`      | Yes                | AI opportunity analysis (1 credit)               |
| POST   | `/ai/leads/:id/outreach`     | Yes                | AI outreach draft (1 credit)                     |
| POST   | `/quality/leads/:id/website` | Yes                | Website quality heuristic check (free)           |
| POST   | `/quality/leads/:id/social`  | Yes                | Social profile scan (free)                       |
| GET    | `/teams`                     | Yes                | Teams you belong to                              |
| POST   | `/teams`                     | Yes                | Create a team                                    |
| GET    | `/teams/:id`                 | Yes                | Team details                                     |
| POST   | `/teams/:id/invite`          | Yes (owner)        | Create an invite link                            |
| POST   | `/teams/join/:token`         | Yes                | Accept an invite                                 |
| POST   | `/teams/:id/leave`           | Yes                | Leave a team                                     |

"Yes" auth routes require the `lf_token` httpOnly cookie set by
signup/signin/Google OAuth. Requests with an `X-Team-Id` header will spend
from and log to that team's shared credit pool instead of the user's
personal balance (used for the "search as team" flow).

## Design notes

- **Credits reset monthly.** Both personal (`User.creditsResetAt`) and team
  (`Team.creditsResetAt`) balances reset to their allowance on the 1st of
  the month, checked lazily on spend rather than via a cron job.
- **Spend is race-safe**, not because of a Mongo transaction (none assumed —
  works against a single standalone mongod, no replica set required), but
  because the deduction itself is an atomic
  `findOneAndUpdate({ creditsRemaining: { $gte: amount } }, { $inc: ... })` —
  it can't succeed twice past zero even under concurrent requests.
- **The server never crashes on a bad `MONGODB_URI`.** It logs a clear error
  and retries every 5s in the background so `/api/health` stays reachable
  for your platform's health checks while the database comes up.
- **Google OAuth uses `google-auth-library` directly**, not Passport — it's
  a stateless authorization-code exchange + ID token verification, which
  fits a JWT-cookie API better than session-based Passport strategies.
