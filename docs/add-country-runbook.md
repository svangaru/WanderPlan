# Add a New Country — Runbook (Phase C)

This document describes how to add a new country to WanderPlan after Phase A (Italy MVP).

## Overview

Phase A ships with Italy only. The schema supports multi-country via:
- Partitioned `country_experiences` table (by country_id)
- Globe visual ready for all countries
- Trip preferences/routing logic country-agnostic

To add a new country, follow this runbook.

## Step 1: Seed Country Data

### 1a. Create a migration to add partitioning for the new country

If this is the **first new country after Italy**, you must implement LIST partitioning on `country_experiences`:

```bash
pnpm prisma migrate create_migration --name partition_country_experiences
```

In the migration SQL file, replace the entire `country_experiences` table with a partitioned version:

```sql
-- Step 1: Drop dependent tables
DROP TABLE IF EXISTS itinerary_day_events;
DROP TABLE IF EXISTS itinerary_day_experiences;
DROP TABLE IF EXISTS country_experiences;

-- Step 2: Create partitioned table
CREATE TABLE country_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  -- ... all other columns ...
) PARTITION BY LIST (country_id);

-- Step 3: Create partition for Italy (if not already present)
CREATE TABLE country_experiences_it PARTITION OF country_experiences
  FOR VALUES IN ('{italy_country_id}');

-- Step 4: Create partition for new country
CREATE TABLE country_experiences_xx PARTITION OF country_experiences
  FOR VALUES IN ('{new_country_id}');

-- Step 5: Recreate dependent tables
CREATE TABLE itinerary_day_experiences ( ... );
CREATE TABLE itinerary_day_events ( ... );
```

### 1b. Add country to seed script (or create new seed file)

Edit `prisma/seed/index.ts` or create `prisma/seed/countries/{code}.ts`:

```typescript
// prisma/seed/countries/france.ts
export const france = {
  code: "FR",
  name: "France",
  continent: "Europe",
  region: "Western Europe",
  currency: "EUR",
  languages: ["fr", "en"],
  timezoneOffsets: ["UTC+1", "UTC+2"],
  avgCostPerDayUsd: new Prisma.Decimal("95"),
  safetyIndex: new Prisma.Decimal("7.6"),
  visaOnArrival: [],
  bestMonths: [5, 6, 9, 10],
};

export const franceExperiences = [
  // 20+ experiences with lat/lng, cost, popularity, description
  // Source: manual research, tourism boards, user feedback
];

export const franceLiveEvents = [
  // 6+ seasonal events (Cannes, Paris Fashion Week, etc.)
];
```

Run: `pnpm db:seed`

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
