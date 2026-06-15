import { describe, it, expect } from "vitest";
import { mockGenerate } from "@/lib/itinerary/mock-engine";
import { itinerarySchema } from "@/lib/itinerary/schema";
import { DEFAULT_PREFS } from "@/lib/constants";
import { addDays } from "@/lib/dates";
import type { ExperienceContext, EventContext, GenerationContext } from "@/lib/types";

const experiences: ExperienceContext[] = [
  { id: "e1", name: "Colosseum", city: "Rome", category: "city", cost_usd: 18, hours: 4, popularity: 9.7, lat: 41.89, lng: 12.49, description: "ancient" },
  { id: "e2", name: "Trastevere Food Tour", city: "Rome", category: "food", cost_usd: 85, hours: 3, popularity: 9.2, lat: 41.88, lng: 12.46, description: "food" },
  { id: "e3", name: "Val d'Orcia Dawn", city: "Siena", category: "photography", cost_usd: 0, hours: 3, popularity: 9.1, lat: 43.06, lng: 11.69, description: "scenic" },
  { id: "e4", name: "Chianti Tasting", city: "Siena", category: "food", cost_usd: 95, hours: 5, popularity: 8.9, lat: 43.31, lng: 11.33, description: "wine" },
  { id: "e5", name: "Pizza Pilgrimage", city: "Naples", category: "food", cost_usd: 35, hours: 2.5, popularity: 9.5, lat: 40.85, lng: 14.26, description: "pizza" },
  { id: "e6", name: "Pompeii", city: "Naples", category: "city", cost_usd: 55, hours: 4, popularity: 9.4, lat: 40.74, lng: 14.48, description: "ruins" },
];

const events: EventContext[] = [
  { id: "ev1", name: "Calcio Storico", city: "Siena", category: "event", start: "2026-06-21", end: "2026-06-21", cost_usd: 30, url: "#", source: "tourism", description: "football" },
];

function ctx(overrides: Partial<GenerationContext["trip"]> = {}): GenerationContext {
  return {
    trip: {
      startDate: "2026-06-20",
      endDate: "2026-06-25",
      startCity: "Rome",
      endCity: "Rome",
      returnTrip: true,
      groupSize: 2,
      groupType: "Friends",
      dietary: [],
      mobility: false,
      budget: 150,
      countries: ["IT"],
      ...overrides,
    },
    prefs: { ...DEFAULT_PREFS },
  };
}

describe("mockGenerate", () => {
  it("produces one valid day per trip day with sequential dates", () => {
    const days = mockGenerate(ctx(), experiences, events);
    expect(days).toHaveLength(6); // inclusive 20→25
    expect(() => itinerarySchema.parse(days)).not.toThrow();
    days.forEach((d, i) => {
      expect(d.day_number).toBe(i + 1);
      expect(d.date).toBe(addDays("2026-06-20", i));
    });
  });

  it("weaves in a live event when city + date align", () => {
    // 10-day trip so all three cities (incl. Siena, the event city) are visited.
    const days = mockGenerate(ctx({ endDate: "2026-06-29" }), experiences, events);
    const eventDay = days.find((d) => d.event_highlight?.name === "Calcio Storico");
    expect(eventDay).toBeDefined();
    expect(eventDay?.city).toBe("Siena");
  });

  it("scales costs up for a luxury accommodation style", () => {
    const budget = mockGenerate({ ...ctx(), prefs: { ...DEFAULT_PREFS, accomStyle: 10 } }, experiences, events);
    const luxury = mockGenerate({ ...ctx(), prefs: { ...DEFAULT_PREFS, accomStyle: 90 } }, experiences, events);
    const sum = (arr: ReturnType<typeof mockGenerate>) =>
      arr.reduce((s, d) => s + d.daily_total_cost_usd, 0);
    expect(sum(luxury)).toBeGreaterThan(sum(budget));
  });

  it("spends more days per city (fewer cities) at a packed pace — faithful to prototype", () => {
    // Prototype semantics: paceCities is days-per-city, so packed=3/city → fewer
    // cities, relaxed=2/city → more cities. (Counter-intuitive but ported as-is.)
    const relaxed = mockGenerate({ ...ctx(), prefs: { ...DEFAULT_PREFS, pace: 10 } }, experiences, events);
    const packed = mockGenerate({ ...ctx(), prefs: { ...DEFAULT_PREFS, pace: 95 } }, experiences, events);
    const cityCount = (arr: ReturnType<typeof mockGenerate>) => new Set(arr.map((d) => d.city)).size;
    expect(cityCount(relaxed)).toBeGreaterThanOrEqual(cityCount(packed));
  });

  it("returns nothing when there are no experiences", () => {
    expect(mockGenerate(ctx(), [], [])).toHaveLength(0);
  });
});
