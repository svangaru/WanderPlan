# WanderPlan Deployment Checklist

This checklist covers moving the app from local to production (Vercel + Supabase).

## Phase 1: GitHub & Vercel (10 min)

- [x] Push code to GitHub: `https://github.com/svangaru/WanderPlan.git`
- [ ] **Vercel Setup:**
  1. Go to [vercel.com](https://vercel.com)
  2. Click **Add New → Project**
  3. Import the GitHub repo `svangaru/WanderPlan`
  4. Framework: Next.js (auto-detected)
  5. Build/install: leave defaults
  6. Click **Deploy**

## Phase 2: Environment Variables (5 min)

Once Vercel imports the repo, configure environment variables in **Settings → Environment Variables**:

### Database (from Supabase)
- `DATABASE_URL` — pooled connection string (port 6543, append `?pgbouncer=true`)
- `DIRECT_URL` — direct/session string (port 5432)

### API Keys
- `ANTHROPIC_API_KEY` — your Anthropic API key
- `ANTHROPIC_MODEL` — `claude-haiku-4-5-20251001` (or upgrade to `claude-sonnet-4-6` for better quality)

### Auth
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate a new one
- `NEXTAUTH_URL` — your Vercel deployment URL (e.g., `https://wanderplan.vercel.app`)
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console

### Cache & Generation
- `REDIS_URL` — Upstash Redis connection string (see Phase 3)
- `GENERATION_ENGINE` — `live` (or `mock` for zero-cost testing)

### Optional Cost Guardrails
- `GEN_DAILY_FULL_LIMIT` — default `10`
- `GEN_DAILY_DAY_LIMIT` — default `40`
- `GEN_MAX_LIVE_DAYS` — default `21`

## Phase 3: Supabase & Redis

### Supabase Database
If not already set up:
1. Create a project at [supabase.com](https://supabase.com)
2. Get the **pooled** and **direct** connection strings
3. Paste into Vercel env vars (see Phase 2)
4. **Local migrations:** run `pnpm db:migrate` against Supabase before deploying (Vercel doesn't run migrations automatically)

### Redis (Upstash)
1. Create a free Redis database at [upstash.com](https://upstash.com)
2. Copy the `redis://...` connection string
3. Paste into Vercel's `REDIS_URL` env var

## Phase 4: Google OAuth

1. Google Cloud Console → **APIs & Services → Credentials**
2. Find your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript origins:**
   - `https://wanderplan.vercel.app` (or your custom domain)
   - Keep `http://localhost:3000` for local dev
4. Add to **Authorized redirect URIs:**
   - `https://wanderplan.vercel.app/api/auth/callback/google`
   - Keep `http://localhost:3000/api/auth/callback/google` for local dev

## Phase 5: Smoke Test

Deploy and verify:
- [ ] `/` landing page loads
- [ ] Click **Log in** → Google OAuth works → redirects to `/globe`
- [ ] Pick a country on globe → `/plan` wizard loads
- [ ] Fill out wizard → click **Generate** → itinerary generated in `/trip/[id]`
- [ ] Logged-out users are redirected to sign-in on `/plan` and `/trip/[id]`

## Next Steps

Once live, the ML hybrid-cascade feature branch is ready:
- `git checkout feat/ml-hybrid-cascade`
- Implements Layer 1 (rule-based scoring) + Layer 2 (optional embeddings) + Layer 3 (Claude fallback)
- Target: reduce API calls from 100% to ~10-15%
- Submit as PR for review
