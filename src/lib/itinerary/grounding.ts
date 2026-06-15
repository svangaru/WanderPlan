import { prisma } from "@/lib/prisma";
import { toIsoDate } from "@/lib/dates";
import type { ExperienceContext, EventContext } from "@/lib/types";

/**
 * Assembles the DB grounding context for generation: every experience for the
 * selected countries plus live events that overlap the trip dates. This is the
 * grounding layer — the model routes/narrates over real rows rather than
 * hallucinating places, which also keeps prompts compact and cheap.
 */
export async function assembleGroundingContext(
  countryCodes: string[],
  startDate: string,
  endDate: string,
): Promise<{ experiences: ExperienceContext[]; events: EventContext[] }> {
  const countries = await prisma.country.findMany({
    where: { code: { in: countryCodes } },
    select: { id: true },
  });
  const countryIds = countries.map((c) => c.id);
  if (countryIds.length === 0) return { experiences: [], events: [] };

  const [experienceRows, eventRows] = await Promise.all([
    prisma.countryExperience.findMany({
      where: { countryId: { in: countryIds } },
      orderBy: { popularityScore: "desc" },
    }),
    prisma.liveEvent.findMany({
      // events that overlap [startDate, endDate]: start <= end AND end >= start
      where: {
        countryId: { in: countryIds },
        startDate: { lte: new Date(endDate) },
        endDate: { gte: new Date(startDate) },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const experiences: ExperienceContext[] = experienceRows.map((e) => ({
    id: e.id,
    name: e.name,
    city: e.locationCity,
    category: e.category,
    cost_usd: Number(e.avgCostUsd),
    hours: Number(e.durationHours),
    popularity: Number(e.popularityScore),
    lat: Number(e.locationLat),
    lng: Number(e.locationLng),
    description: e.description,
  }));

  const events: EventContext[] = eventRows.map((e) => ({
    id: e.id,
    name: e.name,
    city: e.city,
    category: e.category,
    start: toIsoDate(e.startDate),
    end: toIsoDate(e.endDate),
    cost_usd: e.estimatedCostUsd ? Number(e.estimatedCostUsd) : 0,
    url: e.ticketUrl ?? "#",
    source: e.source,
    description: e.description ?? "",
  }));

  return { experiences, events };
}
