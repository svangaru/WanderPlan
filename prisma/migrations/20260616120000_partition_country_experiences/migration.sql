-- Convert country_experiences to a LIST-partitioned table (by countryId) to
-- support multi-country scaling (CLAUDE.md rule 4). Prisma can't declare
-- partitions, so this DDL is the source of truth and the Prisma model is mapped
-- to the resulting table (composite PK [id, countryId]).
--
-- Per-country partitions are created by the seed/runbook as countries are added;
-- a DEFAULT partition catches any country without a dedicated one so inserts
-- never fail. Existing rows are disposable here (re-seeded), so we recreate.

-- The single-column FK from the join table can't point at a composite PK; drop it.
-- experienceId remains as an application-level reference.
ALTER TABLE "itinerary_day_experiences"
  DROP CONSTRAINT IF EXISTS "itinerary_day_experiences_experienceId_fkey";

DROP TABLE IF EXISTS "country_experiences" CASCADE;

CREATE TABLE "country_experiences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "countryId" UUID NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "locationCity" VARCHAR(100) NOT NULL,
  "locationLat" DECIMAL(9,6) NOT NULL,
  "locationLng" DECIMAL(9,6) NOT NULL,
  "avgCostUsd" DECIMAL(8,2) NOT NULL,
  "durationHours" DECIMAL(4,1) NOT NULL,
  "bestSeason" TEXT[],
  "accessibility" DECIMAL(4,2) NOT NULL,
  "popularityScore" DECIMAL(4,2) NOT NULL,
  "sourceUrl" TEXT,
  "lastVerified" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "country_experiences_pkey" PRIMARY KEY ("id", "countryId")
) PARTITION BY LIST ("countryId");

CREATE INDEX "country_experiences_countryId_idx" ON "country_experiences" ("countryId");
CREATE INDEX "country_experiences_locationCity_idx" ON "country_experiences" ("locationCity");

ALTER TABLE "country_experiences"
  ADD CONSTRAINT "country_experiences_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Safety-net partition for any country without a dedicated one.
CREATE TABLE "country_experiences_default" PARTITION OF "country_experiences" DEFAULT;
