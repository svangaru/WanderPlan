import { mockGenerate } from "@/lib/itinerary/mock-engine";
import { generateLive } from "@/lib/itinerary/claude-engine";
import { resolveEngine } from "@/lib/itinerary/generate";
import { GUARDRAILS } from "@/lib/itinerary/guardrails";
import { daysBetween } from "@/lib/dates";
import type { ItineraryDay } from "@/lib/itinerary/schema";
import type {
  GenerationContext,
  ExperienceContext,
  EventContext,
  GenerationEngine,
} from "@/lib/types";

/**
 * Regenerates a single day while keeping locked days fixed. Locked days are
 * summarized into the prompt so the live model continues the route logically.
 * The mock path re-picks an alternate activity for the same city (prototype
 * behavior). Always falls back to mock on live failure.
 */
export async function regenerateDay(params: {
  ctx: GenerationContext;
  experiences: ExperienceContext[];
  events: EventContext[];
  currentDays: ItineraryDay[];
  dayNumber: number;
  lockedDayNumbers: number[];
  requested: GenerationEngine;
}): Promise<{ day: ItineraryDay; engine: GenerationEngine; usage: { inputTokens: number; outputTokens: number } }> {
  const { ctx, experiences, events, currentDays, dayNumber, lockedDayNumbers, requested } = params;
  const target = currentDays.find((d) => d.day_number === dayNumber);
  if (!target) throw new Error(`Day ${dayNumber} not found`);

  const totalDays = daysBetween(ctx.trip.startDate, ctx.trip.endDate);
  const engine = resolveEngine(requested, totalDays);

  const mockDay = (): ItineraryDay => {
    // Nudge prefs to produce an alternate for the same city.
    const alt = mockGenerate(
      { trip: ctx.trip, prefs: { ...ctx.prefs, food: Math.min(100, ctx.prefs.food + 10) } },
      experiences,
      events,
      ctx.trip.countries[0] ?? "Italy",
    );
    const candidate =
      alt.find((d) => d.city === target.city && d.morning.activity !== target.morning.activity) ??
      alt[dayNumber - 1] ??
      target;
    return { ...candidate, day_number: target.day_number, date: target.date, city: target.city };
  };

  if (engine === "mock") {
    return { day: mockDay(), engine: "mock", usage: { inputTokens: 0, outputTokens: 0 } };
  }

  const lockedSummary = currentDays
    .filter((d) => lockedDayNumbers.includes(d.day_number))
    .map((d) => `Day ${d.day_number}: ${d.city} (${d.day_theme})`)
    .join("; ");

  try {
    const live = await generateLive(ctx, experiences, events, {
      maxTokens: GUARDRAILS.liveDayMaxTokens,
      dayStart: dayNumber,
      dayEnd: dayNumber,
      lockedSummary,
    });
    const day = { ...live.itinerary[0], day_number: target.day_number, date: target.date };
    return { day, engine: "live", usage: live.usage };
  } catch {
    return { day: mockDay(), engine: "mock", usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
