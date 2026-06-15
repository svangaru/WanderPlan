# Add a New Country — Runbook

This document describes how to add a new country to WanderPlan.

## Overview

The 10 most-visited countries are live (Italy, France, Spain, US, Türkiye,
Mexico, Japan, Greece, Thailand, Portugal). The architecture already supports
multi-country:
- `country_experiences` is **LIST-partitioned by `countryId`** (one partition per
  country, plus a `DEFAULT` safety-net partition). The partitioned DDL lives in
  `prisma/migrations/20260616120000_partition_country_experiences/`.
- The seed creates each country's partition automatically — no migration needed
  to add a country anymore.
- Globe, wizard, mock-engine flavor, and the itinerary view are country-aware via
  `COUNTRY_FLAVOR` in `src/lib/constants.ts`.

## Step 1: Add the country data file

Create `prisma/seed/countries/{name}.ts` exporting a `CountrySeed` (see the
`CountrySeed` type in `prisma/seed/lib/types.ts`). Costs/coords are plain numbers.

```typescript
// prisma/seed/countries/croatia.ts
import type { CountrySeed } from "../lib/types";

export const croatia: CountrySeed = {
  code: "HR",
  name: "Croatia",
  continent: "Europe",
  region: "Southern Europe",
  currency: "EUR",
  languages: ["hr", "en"],
  timezoneOffsets: ["UTC+1", "UTC+2"],
  avgCostPerDayUsd: 70,
  safetyIndex: 8.0,
  visaOnArrival: [],
  bestMonths: [5, 6, 9, 10],
  experiences: [
    // 15-20 real experiences with lat/lng, cost, hours, popularity, description
  ],
  events: [
    // a few seasonal live events (optional)
  ],
};
```

Then register it in `prisma/seed/countries/index.ts`:

```typescript
import { croatia } from "./croatia";
export const countrySeeds: CountrySeed[] = [/* …existing… */, croatia];
```

Run `pnpm db:seed`. The seed upserts the country, **creates its partition**
(`country_experiences_hr`) automatically, and loads its experiences/events.

## Step 2: Add country-aware flavor + globe entry

In `src/lib/constants.ts`:
- Add a `COUNTRY_FLAVOR["HR"]` entry (name, flag, transport mode/note, accom area,
  local tips) so the mock engine and UI aren't generic for it.
- In `GLOBE_COUNTRIES`, set the country's `active: true` (or add it if missing).

That's it for enabling — generation, persistence, and the itinerary view all key
off the country code.

## Step 2: Scraper Setup (Phase C+)

Once the country is seeded, enable the scraper:

1. **Enable scraper for the new country** in scraper config (TBD in Phase C)
2. **Add country-specific scrapers** in `apps/scraper/sources/`:
   - `eventbrite.ts` — configure Eventbrite country page URL
   - `residentadvisor.ts` — (music events) optional
   - `tourismboards.ts` — add tourism board event URL
3. **Test locally**: `pnpm scraper:run {COUNTRY_CODE}`
4. **Deploy cron** via Railway or GitHub Actions to run daily

## Step 3: Globe & Feature Flags

### 3a. Enable country on globe
Update `src/lib/globe-config.ts`:
```typescript
export const ENABLED_COUNTRIES = ["IT", "FR"]; // add new code
```

### 3b. Optional: Feature flag
If rolling out to limited users:
```typescript
// src/lib/feature-flags.ts
export const ROLLOUT_COUNTRIES = {
  IT: 1.0, // 100% available
  FR: 0.2, // 20% beta
};
```

## Step 4: Test & Deploy

1. **Local test**: `pnpm dev`, select new country, generate itinerary
2. **DB sync**: Ensure Prisma client is regenerated: `pnpm prisma generate`
3. **Deploy**: Push to main, Vercel deploys frontend, Railway/Supabase syncs DB
4. **Smoke test**: Generate a 3-day itinerary in the new country
5. **Monitor**: Check error logs for scraper or API issues

## Checklist

- [ ] Country record in DB with correct metadata
- [ ] 20+ experiences with lat/lng and costs
- [ ] 6+ live events seeded
- [ ] Partitioning migration applied (first country only)
- [ ] Scraper enabled and tested
- [ ] Globe feature flag enabled
- [ ] Itinerary generation tested end-to-end
- [ ] Deployed to production

## Phase C Priority Countries

Target for Phase C (after MVP launch):
1. France
2. Spain
3. Greece
4. Japan
5. Thailand

See `SPEC.md` for full list of 30 launch countries.
