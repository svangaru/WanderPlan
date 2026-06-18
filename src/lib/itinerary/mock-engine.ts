import { addDays, daysBetween, dateOverlaps } from "@/lib/dates";
import { CATEGORY_TO_PREF, countryFlavor } from "@/lib/constants";
import type {
  GenerationContext,
  ExperienceContext,
  EventContext,
} from "@/lib/types";
import type { Itinerary, ItineraryDay } from "@/lib/itinerary/schema";

/**
 * Deterministic, preference-weighted itinerary generator. Ported from the
 * prototype's `mockGenerate`, but operating on DB grounding rows instead of an
 * inlined array. Used as the dev default (GENERATION_ENGINE=mock) and as the
 * runtime fallback when the live API errors — so it never spends tokens.
 */

const EVENING_CATEGORIES = ["nightlife", "music", "concert", "food", "food_festival"];

interface ScoredExperience extends ExperienceContext {
  score: number;
}

export function mockGenerate(
  ctx: GenerationContext,
  experiences: ExperienceContext[],
  events: EventContext[],
  countryCode = "IT",
): Itinerary {
  const { trip, prefs } = ctx;
  const flavor = countryFlavor(countryCode);
  const totalDays = daysBetween(trip.startDate, trip.endDate);
  if (experiences.length === 0) return [];

  const styleMult = prefs.accomStyle > 66 ? 1.6 : prefs.accomStyle < 33 ? 0.6 : 1;
  const costMult = (1.3 - prefs.minCost / 200) * styleMult;

  const scored: ScoredExperience[] = experiences
    .map((e) => {
      const prefKey = CATEGORY_TO_PREF[e.category];
      const w = (prefKey ? prefs[prefKey] : 40) / 100;
      const localBoost = prefs.local > 60 && e.popularity < 8.8 ? 1.2 : 1;
      return { ...e, score: w * e.popularity * localBoost };
    })
    .sort((a, b) => b.score - a.score);

  // Aggregate score per city, then pick how many cities to visit based on pace.
  const cityScores: Record<string, number> = {};
  scored.forEach((e) => {
    cityScores[e.city] = (cityScores[e.city] ?? 0) + e.score;
  });
  const paceCities = prefs.pace > 60 ? 3.0 : prefs.pace < 35 ? 2.0 : 2.5;
  const numCities = Math.max(1, Math.min(6, Math.round(totalDays / paceCities)));
  const cities = Object.entries(cityScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, numCities)
    .map(([c]) => c);

  // Geographic ordering north→south, reversed if starting in the south.
  const cityLat: Record<string, number> = {};
  experiences.forEach((e) => {
    if (!(e.city in cityLat)) cityLat[e.city] = e.lat;
  });
  cities.sort((a, b) => cityLat[b] - cityLat[a]);
  const startLower = (trip.startCity || "").toLowerCase();
  if (["naples", "palermo", "sicily", "amalfi", "bari"].some((s) => startLower.includes(s))) {
    cities.reverse();
  }

  // Allocate days across cities.
  const base = Math.floor(totalDays / cities.length);
  const extra = totalDays - base * cities.length;
  const alloc = cities.map((c, i) => ({ city: c, days: base + (i < extra ? 1 : 0) }));

  const used = new Set<string>();
  const pickFor = (city: string, slot: "morning" | "afternoon" | "evening"): ScoredExperience => {
    const pool = scored.filter((e) => e.city === city && !used.has(e.id));
    let pick =
      slot === "evening"
        ? pool.find((e) => EVENING_CATEGORIES.includes(e.category)) ?? pool[0]
        : pool[0];
    if (!pick) pick = scored.find((e) => !used.has(e.id)) ?? scored[0];
    used.add(pick.id);
    return pick;
  };

  const slotCost = (e: ExperienceContext) => Math.round(e.cost_usd * costMult);
  const days: ItineraryDay[] = [];
  let dayNum = 1;

  alloc.forEach((a, ci) => {
    for (let i = 0; i < a.days; i++) {
      const date = addDays(trip.startDate, dayNum - 1);
      const morning = pickFor(a.city, "morning");
      const afternoon = pickFor(a.city, "afternoon");
      const evening = pickFor(a.city, "evening");
      const ev = events.find((e) => e.city === a.city && dateOverlaps(date, e.start, e.end));

      const transport =
        i === 0 && ci > 0
          ? {
              mode: flavor.transportMode,
              duration: "1.5–3h",
              cost_usd: Math.round(35 * costMult),
              booking_note: flavor.transportNote,
            }
          : null;

      const accomBase = prefs.accomStyle > 66 ? 220 : prefs.accomStyle < 33 ? 45 : 110;
      const accomType =
        prefs.accomType > 55
          ? prefs.accomStyle < 40
            ? "guesthouse"
            : "airbnb"
          : prefs.accomStyle < 33
            ? "hostel"
            : "hotel";

      const eveningCost = ev ? ev.cost_usd : slotCost(evening);
      days.push({
        day_number: dayNum,
        date,
        country: flavor.name,
        city: a.city,
        day_theme: `${morning.category === "hike" ? "Trails & " : ""}${a.city} — ${morning.name
          .split(" ")
          .slice(0, 3)
          .join(" ")}`,
        morning: {
          activity: morning.name,
          location: morning.city,
          duration_hours: morning.hours,
          cost_usd: slotCost(morning),
          tips: morning.description,
        },
        afternoon: {
          activity: afternoon.name,
          location: afternoon.city,
          duration_hours: afternoon.hours,
          cost_usd: slotCost(afternoon),
          tips: afternoon.description,
        },
        evening: {
          activity: ev && evening.category !== "concert" ? ev.name : evening.name,
          location: a.city,
          duration_hours: 3,
          cost_usd: eveningCost,
          tips: ev ? ev.description : evening.description,
        },
        transport_from_previous: transport,
        accommodation: {
          type: accomType,
          name: `${a.city} ${accomType === "airbnb" ? "apartment" : accomType}`,
          area: flavor.accomArea,
          est_cost_per_night_usd: Math.round(accomBase * costMult),
        },
        daily_total_cost_usd: Math.round(
          slotCost(morning) + slotCost(afternoon) + eveningCost + accomBase * costMult + 45 * costMult,
        ),
        local_tip: flavor.localTips[dayNum % flavor.localTips.length],
        event_highlight: ev ? { name: ev.name, url: ev.url, source: ev.source } : null,
      });
      dayNum++;
    }
  });

  // A late arrival "wastes" Day 1 — make it a relaxed arrival day.
  const lateArrival = trip.arrivalTime === "Evening" || trip.arrivalTime === "Late night";
  if (lateArrival && days.length > 0) {
    const d0 = days[0];
    const accomBase = prefs.accomStyle > 66 ? 220 : prefs.accomStyle < 33 ? 45 : 110;
    d0.day_theme = `Arrival in ${d0.city}`;
    d0.morning = {
      activity: `Arrive at ${trip.arrivalAirport || "the airport"} & transfer`,
      location: d0.city,
      duration_hours: 2,
      cost_usd: Math.round(40 * costMult),
      tips: "Airport transfer to your accommodation — take it easy after the flight.",
    };
    d0.afternoon = {
      activity: "Check in & settle in",
      location: d0.city,
      duration_hours: 2,
      cost_usd: 0,
      tips: "Drop bags, freshen up, and get your bearings in the neighbourhood.",
    };
    d0.daily_total_cost_usd = Math.round(
      d0.morning.cost_usd + d0.evening.cost_usd + accomBase * costMult + 25 * costMult,
    );
    d0.local_tip = `You land in the ${trip.arrivalTime.toLowerCase()} — Day 1 is kept light on purpose.`;
  }

  return days;
}
