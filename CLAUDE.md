# CLAUDE.md — WanderPlan

AI-powered travel planner: pick countries on a 3D globe, set preference sliders, get an AI-generated day-by-day itinerary grounded in a Postgres "experiences" database plus scraped live events.

**v1 scope: Italy only.** Schema and routing must support multi-country (up to 5 per trip) from day one, but only Italy gets seeded/enabled.

## Repo orientation

- `SPEC.md` — full product spec: schema, features, AI prompt architecture, scraper design, phased rollout. **Read this first.** It is the source of truth for data shapes and behavior.
- `prototype/wanderplan-prototype.jsx` — working single-file React prototype from claude.ai. This is the **UX/visual reference**: screens, flow, slider groups, day-card layout, map view, generation states, copy tone. Port its look and flow; do not port its architecture (it mocks auth, inlines the DB as JS arrays, and calls the Anthropic API client-side — all of which must become real here).

## Stack (decided — don't relitigate)

Next.js 14 App Router + TypeScript · Tailwind + Framer Motion · react-globe.gl (three.js) · Prisma on PostgreSQL · NextAuth.js · Anthropic API (server-side only) · Redis · Puppeteer/Cheerio scraper as a separate process · Vercel + Railway/Supabase.

## Architecture rules

1. **Anthropic API calls are server-side only** (`/api/generate`), key in `ANTHROPIC_API_KEY` env. Never expose client-side. Stream responses to the client (SSE or AI SDK streaming). Use a real `max_tokens` budget (8k+) and generate the full itinerary in one structured call — the prototype's 2-day chunking was a sandbox workaround, drop it.
2. **Itinerary output is structured JSON** validated with Zod against the day shape in SPEC.md §AI Prompt Architecture. On parse failure: one retry with the validation error appended, then surface a graceful error. Persist `raw_prompt` + `raw_response` to `itineraries` for debuggability.
3. **DB grounding before generation**: `/api/generate` must query `country_experiences` (per selected country) + `live_events` overlapping trip dates and inject both into the prompt context. The DB is the grounding layer; the model does routing/narrative.
4. **Partitioning**: Prisma can't declare PostgreSQL partitions — write the partitioned DDL for `country_experiences` (LIST partition by `country_id`) in a raw SQL migration, and keep the Prisma schema mapped to it. Document the add-a-country runbook (new partition + seed) in `docs/`.
5. **Scraper is a separate workspace/process** (`apps/scraper` or `scraper/`), never imported by the Next.js app. It writes to `live_events` and Redis (`events:{country_code}:{YYYY-MM}`, 24h TTL). The web app only reads.
6. **Mock fallback stays**: keep a deterministic preference-weighted generator (port from prototype `mockGenerate`) behind `GENERATION_ENGINE=mock|live` env flag — used for dev without burning tokens, and as runtime fallback when the API errors.
7. Auth: NextAuth with Google provider first (GitHub + email magic link after). Gate generation and trip persistence behind session. Trips belong to `users` per SPEC schema.

## Commands (establish these early and keep them working)

```
pnpm dev          # next dev
pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # seed countries + Italy experiences + sample events
pnpm scraper:run  # one-shot scraper run (Italy)
pnpm test         # vitest
pnpm lint && pnpm typecheck
```

## Build order (work through phases in order; keep each phase shippable)

### Phase A — Foundation
- [ ] Scaffold Next.js 14 (App Router, TS strict, Tailwind), pnpm, ESLint/Prettier
- [ ] Prisma schema for all tables in SPEC.md; raw-SQL migration for partitioned `country_experiences`
- [ ] Seed script: Italy country row + ≥24 experiences (port from prototype `ITALY_EXPERIENCES`, expand toward 50 with lat/lng, costs, seasons) + 6 sample `live_events` (port `LIVE_EVENTS`)
- [ ] NextAuth (Google) + `users` table wiring + session middleware

### Phase B — Core flow
- [ ] Globe landing (`/`): react-globe.gl, Italy active, others "Phase 2"-disabled; match prototype visual identity (navy #0A0F1E, teal #00E5C3, Syne/Inter)
- [ ] Wizard (`/plan`): 5 steps + 16 sliders per SPEC; persist draft `trips` + `trip_preferences` rows as user advances
- [ ] `/api/generate`: DB context assembly → Claude (streaming) → Zod validation → persist `itineraries` + `itinerary_days`
- [ ] Itinerary view (`/trip/[id]`): day cards (port prototype card design), lock day, regenerate single day (server route; locked days passed as fixed context)
- [ ] Mock engine + `GENERATION_ENGINE` flag

### Phase C — Live data & map
- [ ] Scraper scaffold: orchestrator + `sources/eventbrite.ts` (Italy), rate-limited (1 req/s/domain), dedupe on (name, start_date, city), Redis write-through; cron via Railway/GitHub Actions schedule
- [ ] `/api/events/[country]` read endpoint (Redis-first, Postgres fallback)
- [ ] Map view: Mapbox GL (`NEXT_PUBLIC_MAPBOX_TOKEN`), route line between day cities color-coded by transport mode; fall back to the prototype's SVG Italy if no token set
- [ ] live_events badges on matching itinerary days

### Phase D — Social & accommodation (after C ships)
- [ ] Invite links (`/invite/[token]`), `trip_collaborators` roles, viewer/editor enforcement
- [ ] Per-day comments
- [ ] Accommodation options per day: seed `accommodations` for Italy cities; deep links (Booking.com affiliate URL pattern; Airbnb via plain search deep links — no public API)
- [ ] Saved trips dashboard (`/trips`)

## Testing expectations

- Unit: preference-weighting/scoring logic, Zod itinerary validation, event-date overlap matching, scraper dedupe
- Integration: `/api/generate` with `GENERATION_ENGINE=mock` (no network), auth-gated routes
- Don't snapshot-test the globe/three.js

## Env (.env.example must stay current)

```
DATABASE_URL=
REDIS_URL=
ANTHROPIC_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_MAPBOX_TOKEN=        # optional; SVG fallback without it
GENERATION_ENGINE=mock           # mock | live
```

## Conventions

- TypeScript strict; no `any` in app code
- Server components by default; `"use client"` only where interaction requires it (globe, sliders, day cards)
- All money stored/computed in USD cents internally, formatted at the edge
- Dates: store DATE in Postgres, ISO strings over the wire, no Date math in render
- Conventional commits; small PRs per checklist item
