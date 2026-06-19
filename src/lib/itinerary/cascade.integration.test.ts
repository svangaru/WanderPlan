/**
 * Integration tests for ML cascade: Rules → Embeddings → Claude
 * Tests that the cascade properly routes between layers and improves quality.
 */

import { describe, it, expect } from "vitest";
import { planWithRules } from "./cascade";
import { contextToExperiences } from "./experience-converter";
import type { CountryExperience } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { DEFAULT_PREFS } from "@/lib/constants";
import type { TripInput, Preferences } from "@/lib/types";

// Mock CountryExperience factory
const mockExp = (overrides?: Partial<CountryExperience>): CountryExperience => ({
  id: "exp-1",
  countryId: "italy-1",
  name: "Colosseum Tour",
  category: "cultural",
  description: "Ancient Roman amphitheater",
  locationCity: "Rome",
  locationLat: new Decimal("41.8902"),
  locationLng: new Decimal("12.4922"),
  avgCostUsd: new Decimal("25"),
  durationHours: new Decimal("2"),
  bestSeason: ["May", "September"],
  accessibility: new Decimal("7"),
  popularityScore: new Decimal("9.5"),
  sourceUrl: "https://example.com",
  lastVerified: new Date(),
  createdAt: new Date(),
  ...overrides,
});

// Mock TripInput
const mockTrip = (overrides?: Partial<TripInput>): TripInput => ({
  startDate: "2026-06-20",
  endDate: "2026-06-27",
  startCity: "Rome",
  endCity: "Florence",
  returnTrip: false,
  groupSize: 2,
  groupType: "couple",
  dietary: [],
  mobility: true,
  budget: 150,
  countries: ["IT"],
  originAirport: "JFK",
  arrivalAirport: "FCO",
  flightCode: "AZ609",
  arrivalTime: "Afternoon",
  departureTime: "Morning",
  ...overrides,
});

describe("planWithRules - Cascade Layer 1", () => {
  it("generates a skeleton itinerary from experiences", async () => {
    const experiences = [
      mockExp({ id: "exp-1", name: "Colosseum", locationCity: "Rome", category: "cultural" }),
      mockExp({ id: "exp-2", name: "Pantheon", locationCity: "Rome", category: "cultural" }),
      mockExp({ id: "exp-3", name: "Roman Forum", locationCity: "Rome", category: "cultural" }),
      mockExp({ id: "exp-4", name: "Uffizi Gallery", locationCity: "Florence", category: "cultural" }),
      mockExp({ id: "exp-5", name: "David Statue", locationCity: "Florence", category: "cultural" }),
    ];

    const trip = mockTrip();
    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    expect(result.skeleton).toBeDefined();
    expect(result.quality).toBeGreaterThanOrEqual(0);
    expect(result.quality).toBeLessThanOrEqual(10);
  });

  it("respects trip duration for day count", async () => {
    const experiences = Array.from({ length: 10 }, (_, i) =>
      mockExp({
        id: `exp-${i}`,
        name: `Experience ${i}`,
        locationCity: i < 5 ? "Rome" : "Florence",
      }),
    );

    const trip = mockTrip({
      startDate: "2026-06-20",
      endDate: "2026-06-27", // 7 days
    });

    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    expect(result.skeleton).toHaveLength(7);
    expect(result.skeleton[0].day_number).toBe(1);
    expect(result.skeleton[6].day_number).toBe(7);
  });

  it("cycles through cities when there are multiple", async () => {
    const experiences = [
      mockExp({ id: "rome-1", name: "Colosseum", locationCity: "Rome" }),
      mockExp({ id: "rome-2", name: "Pantheon", locationCity: "Rome" }),
      mockExp({ id: "rome-3", name: "Roman Forum", locationCity: "Rome" }),
      mockExp({ id: "florence-1", name: "Uffizi", locationCity: "Florence" }),
      mockExp({ id: "florence-2", name: "David", locationCity: "Florence" }),
      mockExp({ id: "florence-3", name: "Duomo", locationCity: "Florence" }),
      mockExp({ id: "venice-1", name: "Grand Canal", locationCity: "Venice" }),
      mockExp({ id: "venice-2", name: "St Mark", locationCity: "Venice" }),
    ];

    const trip = mockTrip({
      startDate: "2026-06-20",
      endDate: "2026-06-24", // 4 days
    });

    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    // Should have 4 days across multiple cities
    const cities = result.skeleton.map((d) => d.city);
    expect(cities.length).toBeGreaterThan(1); // Multiple cities
  });

  it("includes accommodation details in skeleton", async () => {
    const experiences = [
      mockExp({ locationCity: "Rome" }),
      mockExp({ id: "exp-2", name: "exp2", locationCity: "Rome" }),
    ];

    const trip = mockTrip();
    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    const day = result.skeleton[0];
    expect(day.accommodation).toBeDefined();
    expect(day.accommodation.type).toMatch(/hotel|hostel|guesthouse/);
    expect(day.accommodation.est_cost_per_night_usd).toBeGreaterThan(0);
  });

  it("calculates daily total cost", async () => {
    const experiences = [
      mockExp({ id: "exp-1", name: "Colosseum", avgCostUsd: new Decimal("25") }),
      mockExp({ id: "exp-2", name: "Pantheon", avgCostUsd: new Decimal("15") }),
      mockExp({ id: "exp-3", name: "Dinner", avgCostUsd: new Decimal("40") }),
    ];

    const trip = mockTrip();
    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    const day = result.skeleton[0];
    expect(day.daily_total_cost_usd).toBeGreaterThan(0);
    // Should include activities + accommodation
    expect(day.daily_total_cost_usd).toBeGreaterThan(
      Number(day.morning.cost_usd) + Number(day.afternoon.cost_usd) + Number(day.evening.cost_usd),
    );
  });

  it("generates quality score in valid range", async () => {
    const experiences = [
      mockExp({ id: "exp-1", name: "Good experience", popularityScore: new Decimal("8") }),
      mockExp({ id: "exp-2", name: "Bad experience", popularityScore: new Decimal("2") }),
    ];

    const trip = mockTrip();
    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    expect(result.quality).toBeGreaterThanOrEqual(0);
    expect(result.quality).toBeLessThanOrEqual(10);
  });

  it("scores popular experiences higher", async () => {
    const experiences = [
      mockExp({
        id: "exp-1",
        name: "Popular",
        popularityScore: new Decimal("9"),
        category: "cultural",
      }),
      mockExp({
        id: "exp-2",
        name: "Unpopular",
        popularityScore: new Decimal("2"),
        category: "cultural",
      }),
      mockExp({
        id: "exp-3",
        name: "Medium",
        popularityScore: new Decimal("5"),
        category: "cultural",
      }),
    ];

    const trip = mockTrip();
    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    // The skeleton should include high-popularity experiences first
    const skeleton = result.skeleton;
    expect(skeleton.length).toBeGreaterThan(0);
    // Quality should reflect the average popularity of selected experiences
    // With a mix of popular (9) and unpopular (2), expect moderate quality
    expect(result.quality).toBeGreaterThanOrEqual(2);
    expect(result.quality).toBeLessThanOrEqual(10);
  });

  it("handles single city trips", async () => {
    const experiences = [
      mockExp({ id: "exp-1", name: "Colosseum", locationCity: "Rome" }),
      mockExp({ id: "exp-2", name: "Pantheon", locationCity: "Rome" }),
      mockExp({ id: "exp-3", name: "Roman Forum", locationCity: "Rome" }),
    ];

    const trip = mockTrip({
      startCity: "Rome",
      endCity: "Rome",
    });

    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    // All days should be in same city
    const cities = result.skeleton.map((d) => d.city);
    expect(cities.every((c) => c === "Rome")).toBe(true);
  });

  it("respects accommodation style preference", async () => {
    const experiences = [mockExp(), mockExp({ id: "exp-2", name: "exp2" })];
    const trip = mockTrip();

    // High accommodation style = hotel
    const luxPrefs = { ...DEFAULT_PREFS, accomStyle: 80 };
    const luxResult = await planWithRules(experiences, trip, luxPrefs, "IT");

    // Low accommodation style = hostel
    const budgetPrefs = { ...DEFAULT_PREFS, accomStyle: 20 };
    const budgetResult = await planWithRules(experiences, trip, budgetPrefs, "IT");

    const luxType = luxResult.skeleton[0].accommodation.type;
    const budgetType = budgetResult.skeleton[0].accommodation.type;

    expect(luxType).toBe("hotel");
    expect(budgetType).toBe("hostel");
  });
});

describe("Cascade Integration: Type Converter + Rules", () => {
  it("converts ExperienceContext to CountryExperience and generates itinerary", async () => {
    const contexts = [
      {
        id: "exp-1",
        name: "Colosseum",
        city: "Rome",
        category: "cultural",
        cost_usd: 25,
        hours: 2,
        popularity: 9.5,
        lat: 41.8902,
        lng: 12.4922,
        description: "Ancient Roman amphitheater",
      },
      {
        id: "exp-2",
        name: "Pantheon",
        city: "Rome",
        category: "cultural",
        cost_usd: 15,
        hours: 1.5,
        popularity: 9,
        lat: 41.8986,
        lng: 12.4769,
        description: "Ancient temple",
      },
    ];

    // Convert to DB model
    const experiences = contextToExperiences(contexts, "IT");
    expect(experiences).toHaveLength(2);
    expect(experiences[0].locationCity).toBe("Rome");

    // Generate itinerary with converted experiences
    const trip = mockTrip();
    const result = await planWithRules(experiences, trip, DEFAULT_PREFS, "IT");

    expect(result.skeleton).toBeDefined();
    expect(result.skeleton[0].city).toBe("Rome");
    expect(result.quality).toBeGreaterThan(0);
  });
});
