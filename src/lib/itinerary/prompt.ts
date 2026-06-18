import { addDays, daysBetween } from "@/lib/dates";
import { countryFlavor } from "@/lib/constants";
import type {
  GenerationContext,
  ExperienceContext,
  EventContext,
} from "@/lib/types";

/**
 * Builds the generation prompt (SPEC §AI Prompt Architecture). Grounding rows
 * are trimmed to the fields the model needs, keeping the prompt — and therefore
 * input-token cost — as small as possible.
 */
export function buildItineraryPrompt(
  ctx: GenerationContext,
  experiences: ExperienceContext[],
  events: EventContext[],
  opts: { dayStart?: number; dayEnd?: number; lockedSummary?: string } = {},
): string {
  const { trip, prefs } = ctx;
  const totalDays = daysBetween(trip.startDate, trip.endDate);
  const dayStart = opts.dayStart ?? 1;
  const dayEnd = opts.dayEnd ?? totalDays;
  const count = dayEnd - dayStart + 1;
  const startDateForRange = addDays(trip.startDate, dayStart - 1);
  const countryNames = trip.countries.map((c) => countryFlavor(c).name).join(", ") || "Italy";

  const dbCtx = experiences.map((e) => ({
    name: e.name,
    city: e.city,
    category: e.category,
    cost_usd: e.cost_usd,
    hours: e.hours,
    popularity: e.popularity,
  }));
  const eventsCtx = events.map((e) => ({
    name: e.name,
    city: e.city,
    start: e.start,
    end: e.end,
    cost: e.cost_usd,
  }));

  return `You are WanderPlan's expert travel curator. Generate ${count === totalDays ? `a ${totalDays}-day` : `days ${dayStart}–${dayEnd} of a ${totalDays}-day`} ${countryNames} itinerary.

TRIP: ${trip.startDate} to ${trip.endDate}. Start city: ${trip.startCity || "Rome"}. End city: ${trip.returnTrip ? trip.startCity || "Rome" : trip.endCity || trip.startCity || "Rome"}. Group: ${trip.groupSize} (${trip.groupType}). Budget/day/person: $${trip.budget}.
FLIGHTS: Arrives at ${trip.arrivalAirport || "the destination airport"} on ${trip.startDate} in the ${trip.arrivalTime.toLowerCase()}${trip.flightCode ? ` (flight ${trip.flightCode})` : ""}; departs from ${trip.originAirport || "home"} side on ${trip.endDate} in the ${trip.departureTime.toLowerCase()}. IMPORTANT: scale Day 1 to the arrival time — an Evening or Late night arrival means Day 1 is just airport transfer, check-in, and a relaxed nearby dinner (no full-day activities). Likewise keep the final day light if departure is in the Morning.
DIETARY: ${trip.dietary.join(", ") || "none"}. MOBILITY NEEDS: ${trip.mobility ? "yes — avoid strenuous hikes/stairs" : "no"}.
${opts.lockedSummary ? `ALREADY-FIXED DAYS (do not change; continue the route logically with no backtracking): ${opts.lockedSummary}` : ""}

PREFERENCE SCORES (0=ignore, 100=prioritize): food=${prefs.food} nature=${prefs.nature} city=${prefs.city} music=${prefs.music} beach=${prefs.beach} culture=${prefs.culture} nightlife=${prefs.nightlife} wellness=${prefs.wellness} photography=${prefs.photography} pace(0=relaxed,100=packed)=${prefs.pace} discovery(0=hotspots,100=hidden)=${prefs.local} budgetSensitivity=${prefs.minCost} flightAversion=${prefs.minFlights}.

DATABASE (country_experiences — prefer these real places): ${JSON.stringify(dbCtx)}
LIVE EVENTS (scraped, during trip — weave in when city+date align): ${JSON.stringify(eventsCtx)}

Respond with ONLY a raw JSON array (no markdown, no prose) of ${count} day objects with this exact shape:
[{"day_number":${dayStart},"date":"YYYY-MM-DD","country":"...","city":"...","day_theme":"...","morning":{"activity":"...","location":"...","duration_hours":3,"cost_usd":0,"tips":"..."},"afternoon":{...},"evening":{...},"transport_from_previous":null,"accommodation":{"type":"hotel","name":"...","area":"...","est_cost_per_night_usd":0},"daily_total_cost_usd":0,"local_tip":"...","event_highlight":null}]
Rules: prefer DATABASE experiences; ensure logical geographic flow with minimal backtracking; respect flight aversion (score>60 → trains/ferries, never flights within one country); scale costs to the budget. Dates must be sequential starting ${startDateForRange}.`;
}
