# Deploy to Vercel

The database (Supabase) is already live. This covers shipping the web app to
Vercel. ~10 minutes.

## 0. Push the repo to GitHub (one-time)

The repo is currently local-only. Create a GitHub repo and push:

```bash
gh repo create wanderplan --private --source=. --remote=origin --push
# or, if you made the repo in the GitHub UI:
git remote add origin git@github.com:<you>/wanderplan.git
git push -u origin main
```

`.env` is gitignored, so no secrets are pushed — only `.env.example`.

## 1. Import into Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Build/install commands: leave
   default — `pnpm install` runs `prisma generate` via the `postinstall` script,
   then `next build`.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

Copy these from your local `.env`, with the **prod-specific** changes noted:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **pooled** string (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase **direct/session** string (port 5432) |
| `ANTHROPIC_API_KEY` | your key |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` |
| `GENERATION_ENGINE` | `live` (or `mock` for zero-cost) |
| `NEXTAUTH_SECRET` | **regenerate for prod**: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | your Vercel URL, e.g. `https://wanderplan.vercel.app` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | your OAuth client |
| `REDIS_URL` | Upstash connection string (see step 4) |

## 3. Update Google OAuth for production

Google Cloud Console → Credentials → your OAuth client → add:

- **Authorized JavaScript origins:** `https://<your-domain>`
- **Authorized redirect URIs:** `https://<your-domain>/api/auth/callback/google`

(Keep the localhost entries for local dev.)

## 4. Redis in production — Upstash (free)

Vercel has no Redis; without it the rate-limiter and city-cache fall back to
per-instance memory (resets on every cold start). Fix:

1. upstash.com → create a **Redis** database (free tier).
2. Copy the `redis://` connection string into Vercel's `REDIS_URL`.

`ioredis` connects to it as-is; no code change needed.

## 5. Deploy + smoke test

Push to `main` (or click Deploy). Then verify on the live URL:

- `/` landing renders; **Log in** → Google → lands on `/globe`.
- Pick a country → wizard → generate → itinerary.
- `/globe` and `/plan` redirect to sign-in when logged out.

## Notes

- Migrations: run `pnpm prisma migrate deploy` locally against Supabase when you
  add migrations (Vercel does not run migrations on deploy).
- `maxDuration` on `/api/generate` is 60s — fine on Vercel's default plan for
  Haiku-speed generations.
