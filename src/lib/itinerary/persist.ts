import { prisma } from "@/lib/prisma";
import { toIsoDate } from "@/lib/dates";
import type { Itinerary, ItineraryDay } from "@/lib/itinerary/schema";
import type { EventContext, ExperienceContext } from "@/lib/types";

/**
 * Persists a generated itinerary and its days. Marks any prior itineraries for
 * the trip inactive so `is_active` always points at the latest. Persists
 * raw_prompt + raw_response for debuggability (CLAUDE.md rule 2). Links each day
 * to the experiences/events it references for downstream joins.
 */
export async function persistItinerary(params: {
  tripId: string;
  itinerary: Itinerary;
  modelVersion: string;
  rawPrompt: string;
  rawResponse: string;
  experiences: ExperienceContext[];
  events: EventContext[];
}): Promise<string> {
  const { tripId, itinerary, modelVersion, rawPrompt, rawResponse, experiences, events } = params;

  const expByName = new Map(experiences.map((e) => [e.name, e.id]));
  const eventByName = new Map(events.map((e) => [e.name, e.id]));

  return prisma.$transaction(async (tx) => {
    await tx.itinerary.updateMany({ where: { tripId }, data: { isActive: false } });

    const itin = await tx.itinerary.create({
      data: { tripId, modelVersion, rawPrompt, rawResponse, isActive: true },
    });

    for (const day of itinerary) {
      const created = await tx.itineraryDay.create({
        data: itineraryDayToRow(itin.id, day),
      });

      const expIds = collectExperienceIds(day, expByName);
      for (const experienceId of expIds) {
        await tx.itineraryDayExperience.create({
          data: { itineraryDayId: created.id, experienceId },
        });
      }

      if (day.event_highlight) {
        const eventId = eventByName.get(day.event_highlight.name);
        if (eventId) {
          await tx.itineraryDayEvent.create({
            data: { itineraryDayId: created.id, eventId },
          });
        }
      }
    }

    return itin.id;
  });
}

function itineraryDayToRow(itineraryId: string, day: ItineraryDay) {
  return {
    itineraryId,
    dayNumber: day.day_number,
    date: new Date(day.date),
    countryCode: countryCodeFor(day.country),
    city: day.city,
    dayTheme: day.day_theme,
    morningActivity: JSON.stringify(day.morning),
    afternoonActivity: JSON.stringify(day.afternoon),
    eveningActivity: JSON.stringify(day.evening),
    accommodationType: day.accommodation.type,
    accommodationNotes: JSON.stringify(day.accommodation),
    transportFromPrev: day.transport_from_previous
      ? JSON.stringify(day.transport_from_previous)
      : null,
    estimatedCostUsd: day.daily_total_cost_usd,
    tips: [day.local_tip].filter(Boolean),
  };
}

function collectExperienceIds(day: ItineraryDay, byName: Map<string, string>): string[] {
  const ids = new Set<string>();
  for (const slot of [day.morning, day.afternoon, day.evening]) {
    const id = byName.get(slot.activity);
    if (id) ids.add(id);
  }
  return [...ids];
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = { Italy: "IT" };
function countryCodeFor(name: string): string {
  return COUNTRY_NAME_TO_CODE[name] ?? name.slice(0, 2).toUpperCase();
}

/** Replaces a single day (by dayNumber) within an active itinerary in place. */
export async function replaceItineraryDay(params: {
  itineraryId: string;
  day: ItineraryDay;
  experiences: ExperienceContext[];
  events: EventContext[];
}): Promise<void> {
  const { itineraryId, day, experiences, events } = params;
  const expByName = new Map(experiences.map((e) => [e.name, e.id]));
  const eventByName = new Map(events.map((e) => [e.name, e.id]));

  await prisma.$transaction(async (tx) => {
    const existing = await tx.itineraryDay.findFirst({
      where: { itineraryId, dayNumber: day.day_number },
    });
    if (!existing) throw new Error(`Day ${day.day_number} not found for itinerary`);

    await tx.itineraryDayExperience.deleteMany({ where: { itineraryDayId: existing.id } });
    await tx.itineraryDayEvent.deleteMany({ where: { itineraryDayId: existing.id } });

    const row = itineraryDayToRow(itineraryId, day);
    await tx.itineraryDay.update({ where: { id: existing.id }, data: row });

    for (const experienceId of collectExperienceIds(day, expByName)) {
      await tx.itineraryDayExperience.create({
        data: { itineraryDayId: existing.id, experienceId },
      });
    }
    if (day.event_highlight) {
      const eventId = eventByName.get(day.event_highlight.name);
      if (eventId) {
        await tx.itineraryDayEvent.create({ data: { itineraryDayId: existing.id, eventId } });
      }
    }
  });
}

/**
 * Loads the active itinerary for a trip and reconstructs the wire-shape day
 * objects from the persisted JSON columns.
 */
export async function loadActiveItinerary(tripId: string): Promise<{
  itineraryId: string;
  engineModel: string;
  days: Itinerary;
} | null> {
  const itin = await prisma.itinerary.findFirst({
    where: { tripId, isActive: true },
    include: { days: { orderBy: { dayNumber: "asc" } } },
  });
  if (!itin) return null;

  const days: Itinerary = itin.days.map((d) => ({
    day_number: d.dayNumber,
    date: toIsoDate(d.date),
    country: d.countryCode,
    city: d.city,
    day_theme: d.dayTheme,
    morning: JSON.parse(d.morningActivity),
    afternoon: JSON.parse(d.afternoonActivity),
    evening: JSON.parse(d.eveningActivity),
    transport_from_previous: d.transportFromPrev ? JSON.parse(d.transportFromPrev) : null,
    accommodation: d.accommodationNotes
      ? JSON.parse(d.accommodationNotes)
      : { type: d.accommodationType ?? "hotel", name: "", area: "", est_cost_per_night_usd: 0 },
    daily_total_cost_usd: d.estimatedCostUsd ? Number(d.estimatedCostUsd) : 0,
    local_tip: d.tips[0] ?? "",
    event_highlight: null,
  }));

  return { itineraryId: itin.id, engineModel: itin.modelVersion, days };
}
