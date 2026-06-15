import { describe, it, expect } from "vitest";
import { itineraryDaySchema, itinerarySchema } from "@/lib/itinerary/schema";

const validDay = {
  day_number: 1,
  date: "2026-06-20",
  country: "Italy",
  city: "Rome",
  day_theme: "Ancient Rome",
  morning: { activity: "Colosseum", location: "Rome", duration_hours: 4, cost_usd: 18, tips: "go early" },
  afternoon: { activity: "Forum", location: "Rome", duration_hours: 3, cost_usd: 0, tips: "" },
  evening: { activity: "Trastevere", location: "Rome", duration_hours: 3, cost_usd: 85, tips: "" },
  transport_from_previous: null,
  accommodation: { type: "hotel", name: "Rome Hotel", area: "centro", est_cost_per_night_usd: 120 },
  daily_total_cost_usd: 250,
  local_tip: "espresso after meals",
  event_highlight: null,
};

describe("itinerary schema", () => {
  it("accepts a well-formed day", () => {
    expect(() => itineraryDaySchema.parse(validDay)).not.toThrow();
  });

  it("rejects a malformed date", () => {
    expect(() => itineraryDaySchema.parse({ ...validDay, date: "June 20" })).toThrow();
  });

  it("rejects negative costs", () => {
    const bad = { ...validDay, daily_total_cost_usd: -5 };
    expect(() => itineraryDaySchema.parse(bad)).toThrow();
  });

  it("requires a non-empty array", () => {
    expect(() => itinerarySchema.parse([])).toThrow();
    expect(() => itinerarySchema.parse([validDay])).not.toThrow();
  });

  it("accepts an event highlight", () => {
    const withEvent = {
      ...validDay,
      event_highlight: { name: "Calcio Storico", url: "#", source: "tourism-board" },
    };
    expect(() => itineraryDaySchema.parse(withEvent)).not.toThrow();
  });
});
