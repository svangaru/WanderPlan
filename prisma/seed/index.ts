import { PrismaClient } from "@prisma/client";
import { countrySeeds } from "./countries";
import type { CountrySeed } from "./lib/types";

const prisma = new PrismaClient();

/**
 * Seeds each country: upserts the master row, ensures a dedicated partition of
 * the LIST-partitioned country_experiences table exists, then loads its
 * experiences and sample live events. Idempotent — safe to re-run.
 */
async function seedCountry(seed: CountrySeed): Promise<void> {
  const country = await prisma.country.upsert({
    where: { code: seed.code },
    update: {
      name: seed.name,
      continent: seed.continent,
      region: seed.region,
      currency: seed.currency,
      languages: seed.languages,
      timezoneOffsets: seed.timezoneOffsets,
      avgCostPerDayUsd: seed.avgCostPerDayUsd,
      safetyIndex: seed.safetyIndex,
      visaOnArrival: seed.visaOnArrival,
      bestMonths: seed.bestMonths,
    },
    create: {
      code: seed.code,
      name: seed.name,
      continent: seed.continent,
      region: seed.region,
      currency: seed.currency,
      languages: seed.languages,
      timezoneOffsets: seed.timezoneOffsets,
      avgCostPerDayUsd: seed.avgCostPerDayUsd,
      safetyIndex: seed.safetyIndex,
      visaOnArrival: seed.visaOnArrival,
      bestMonths: seed.bestMonths,
    },
  });

  // Clear existing rows for this country first so attaching a dedicated
  // partition never collides with rows sitting in the DEFAULT partition.
  await prisma.countryExperience.deleteMany({ where: { countryId: country.id } });
  await prisma.liveEvent.deleteMany({ where: { countryId: country.id } });

  const partition = `country_experiences_${seed.code.toLowerCase()}`;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${partition}" PARTITION OF "country_experiences" FOR VALUES IN ('${country.id}')`,
  );

  for (const e of seed.experiences) {
    await prisma.countryExperience.create({
      data: {
        countryId: country.id,
        category: e.category,
        name: e.name,
        description: e.desc,
        locationCity: e.city,
        locationLat: e.lat,
        locationLng: e.lng,
        avgCostUsd: e.cost,
        durationHours: e.hours,
        bestSeason: e.bestSeason ?? [],
        accessibility: e.accessibility ?? 7,
        popularityScore: e.pop,
      },
    });
  }

  for (const ev of seed.events ?? []) {
    await prisma.liveEvent.create({
      data: {
        countryId: country.id,
        name: ev.name,
        city: ev.city,
        category: ev.category ?? "event",
        startDate: new Date(ev.start),
        endDate: new Date(ev.end),
        description: ev.desc,
        estimatedCostUsd: ev.cost,
        source: ev.source,
      },
    });
  }

  console.log(
    `✓ ${seed.name} (${seed.code}): ${seed.experiences.length} experiences, ${seed.events?.length ?? 0} events`,
  );
}

async function main() {
  console.log(`🌍 Seeding ${countrySeeds.length} countries…`);
  for (const seed of countrySeeds) {
    await seedCountry(seed);
  }
  console.log("🌍 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
