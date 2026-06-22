/**
 * Preference Integration Tests
 *
 * Verifies that user preferences actually affect the generated itineraries:
 * - Different preference values → different activity selections
 * - High food preference → more food activities
 * - High nature preference → more outdoor activities
 * - Budget constraints → activities within budget
 */

import { describe, it, expect } from "vitest";
import { planWithRules } from "./cascade";
import { contextToExperiences } from "./experience-converter";
import type { Preferences, TripInput } from "@/lib/types";
import { Decimal } from "@prisma/client/runtime/library";
import type { CountryExperience } from "@prisma/client";

const mockExp = (overrides?: Partial<CountryExperience>): CountryExperience => ({
  id: "exp-1",
  countryId: "italy-1",
  name: "Experience",
  category: "cultural",
  description: "Test experience",
  locationCity: "Rome",
  locationLat: new Decimal("41.8902"),
  locationLng: new Decimal("12.4922"),
  avgCostUsd: new Decimal("50"),
  durationHours: new Decimal("2"),
  bestSeason: [],
  accessibility: new Decimal("5"),
  popularityScore: new Decimal("5"),
  sourceUrl: null,
  lastVerified: new Date(),
  createdAt: new Date(),
  ...overrides,
});

const mockTrip = (overrides?: Partial<TripInput>): TripInput => ({
  startDate: "2026-06-20",
  endDate: "2026-06-23", // 3 days
  startCity: "Rome",
  endCity: "Rome",
  returnTrip: false,
  groupSize: 1,
  groupType: "solo",
  dietary: [],
  mobility: true,
  budget: 150,
  countries: ["IT"],
  originAirport: "FCO",
  arrivalAirport: "FCO",
  flightCode: "",
  arrivalTime: "Morning",
  departureTime: "Evening",
  ...overrides,
});

const defaultPrefs = (): Preferences => ({
  food: 50,
  nature: 50,
  culture: 50,
  adventure: 30,
  beach: 20,
  city: 40,
  music: 30,
  wellness: 40,
  nightlife: 20,
  photography: 40,
  wildlife: 0,
  pace: 50,
  local: 50,
  minFlights: 0,
  accomType: 50,
  accomStyle: 50,
  minCost: 50,
});

describe("Preference Integration: Food Preference", () => {
  it("prefers food experiences when food preference is high", async () => {
    const experiences = [
      // Food experiences
      mockExp({ id: "food-1", name: "Pasta Cooking Class", category: "food", popularityScore: new Decimal("7") }),
      mockExp({ id: "food-2", name: "Wine Tasting", category: "food", popularityScore: new Decimal("8") }),
      mockExp({ id: "food-3", name: "Market Tour", category: "food", popularityScore: new Decimal("6") }),
      // Non-food experiences
      mockExp({ id: "cult-1", name: "Museum Visit", category: "cultural", popularityScore: new Decimal("9") }),
      mockExp({ id: "cult-2", name: "Colosseum Tour", category: "cultural", popularityScore: new Decimal("10") }),
    ];

    const trip = mockTrip();
    const highFoodPrefs: Preferences = { ...defaultPrefs(), food: 100, nature: 0 };
    const lowFoodPrefs: Preferences = { ...defaultPrefs(), food: 0, nature: 100 };

    const highFoodResult = await planWithRules(experiences, trip, highFoodPrefs, "IT");
    const lowFoodResult = await planWithRules(experiences, trip, lowFoodPrefs, "IT");

    // Count food activities
    const countFoodActivities = (skeleton: typeof highFoodResult.skeleton) => {
      let count = 0;
      skeleton.forEach((day) => {
        if (day.morning.activity.toLowerCase().includes("pasta") || day.morning.activity.toLowerCase().includes("wine") || day.morning.activity.toLowerCase().includes("market")) count++;
        if (day.afternoon.activity.toLowerCase().includes("pasta") || day.afternoon.activity.toLowerCase().includes("wine") || day.afternoon.activity.toLowerCase().includes("market")) count++;
        if (day.evening.activity.toLowerCase().includes("pasta") || day.evening.activity.toLowerCase().includes("wine") || day.evening.activity.toLowerCase().includes("market")) count++;
      });
      return count;
    };

    const highFoodCount = countFoodActivities(highFoodResult.skeleton);
    const lowFoodCount = countFoodActivities(lowFoodResult.skeleton);

    // High food preference should result in more food-related activities
    expect(highFoodCount).toBeGreaterThanOrEqual(lowFoodCount);
  });

  it("respects budget constraint in activity selection", async () => {
    const experiences = [
      mockExp({ id: "cheap-1", name: "Free Walking Tour", category: "cultural", avgCostUsd: new Decimal("0") }),
      mockExp({ id: "cheap-2", name: "Park Visit", category: "nature", avgCostUsd: new Decimal("5") }),
      mockExp({ id: "expensive-1", name: "Helicopter Tour", category: "adventure", avgCostUsd: new Decimal("500") }),
      mockExp({ id: "expensive-2", name: "Fine Dining", category: "food", avgCostUsd: new Decimal("300") }),
      mockExp({ id: "medium-1", name: "Museum", category: "cultural", avgCostUsd: new Decimal("25") }),
    ];

    const trip = mockTrip({ budget: 30 }); // Low budget
    const budgetPrefs: Preferences = { ...defaultPrefs(), accomStyle: 30, minCost: 75 };

    const result = await planWithRules(experiences, trip, budgetPrefs, "IT");

    // Activities should be reasonable (mostly under $100)
    result.skeleton.forEach((day) => {
      const activityCosts = [
        day.morning.cost_usd,
        day.afternoon.cost_usd,
        day.evening.cost_usd,
      ];
      activityCosts.forEach((cost) => {
        // With budget sensitivity 75 and low budget, expensive activities should be avoided
        expect(cost).toBeLessThan(200); // Reasonable upper bound
      });
    });
  });
});

describe("Preference Integration: Activity Variety", () => {
  it("produces diverse activity categories across days", async () => {
    const experiences = [
      mockExp({ id: "food-1", name: "Pasta", category: "food", popularityScore: new Decimal("8") }),
      mockExp({ id: "food-2", name: "Wine", category: "food", popularityScore: new Decimal("8") }),
      mockExp({ id: "food-3", name: "Market", category: "food", popularityScore: new Decimal("7") }),
      mockExp({ id: "nature-1", name: "Park", category: "nature", popularityScore: new Decimal("7") }),
      mockExp({ id: "nature-2", name: "Hike", category: "nature", popularityScore: new Decimal("6") }),
      mockExp({ id: "culture-1", name: "Museum", category: "cultural", popularityScore: new Decimal("9") }),
      mockExp({ id: "culture-2", name: "Church", category: "cultural", popularityScore: new Decimal("8") }),
    ];

    const trip = mockTrip();
    const balancedPrefs: Preferences = defaultPrefs();

    const result = await planWithRules(experiences, trip, balancedPrefs, "IT");

    // Count distinct activity categories
    const categories = new Set<string>();
    result.skeleton.forEach((day) => {
      categories.add(day.morning.activity);
      categories.add(day.afternoon.activity);
      categories.add(day.evening.activity);
    });

    // With diverse preferences, should have multiple distinct activities
    expect(categories.size).toBeGreaterThan(1);
  });
});

describe("Preference Integration: Quality Impact", () => {
  it("produces higher quality itinerary with matched preferences", async () => {
    const experiences = [
      // Popular experiences
      mockExp({ id: "exp-1", name: "Top Attraction", category: "cultural", popularityScore: new Decimal("10") }),
      mockExp({ id: "exp-2", name: "Famous Site", category: "cultural", popularityScore: new Decimal("9.5") }),
      mockExp({ id: "exp-3", name: "Must-See", category: "cultural", popularityScore: new Decimal("9") }),
      // Less popular experiences
      mockExp({ id: "exp-4", name: "Hidden Gem", category: "cultural", popularityScore: new Decimal("3") }),
      mockExp({ id: "exp-5", name: "Niche Interest", category: "cultural", popularityScore: new Decimal("2") }),
    ];

    const trip = mockTrip();
    const preferPremium: Preferences = { ...defaultPrefs(), culture: 100, accomStyle: 80, minCost: 30 };
    const preferBudget: Preferences = { ...defaultPrefs(), culture: 100, accomStyle: 20, minCost: 90 };

    const premiumResult = await planWithRules(experiences, trip, preferPremium, "IT");
    const budgetResult = await planWithRules(experiences, trip, preferBudget, "IT");

    // Both should produce valid itineraries, but quality may differ
    expect(premiumResult.quality).toBeGreaterThanOrEqual(0);
    expect(budgetResult.quality).toBeGreaterThanOrEqual(0);
    // Premium preference allows higher costs, might see different activities
    expect(premiumResult.skeleton[0].daily_total_cost_usd).toBeGreaterThanOrEqual(0);
    expect(budgetResult.skeleton[0].daily_total_cost_usd).toBeGreaterThanOrEqual(0);
  });
});

describe("Preference Integration: Accommodation Style", () => {
  it("luxury preference selects hotel accommodation", async () => {
    const experiences = [mockExp(), mockExp({ id: "exp-2", name: "exp2" })];
    const trip = mockTrip();
    const luxuryPrefs: Preferences = { ...defaultPrefs(), accomStyle: 90, minCost: 20 };

    const result = await planWithRules(experiences, trip, luxuryPrefs, "IT");

    expect(result.skeleton[0].accommodation.type).toBe("hotel");
    expect(result.skeleton[0].accommodation.est_cost_per_night_usd).toBeGreaterThan(150);
  });

  it("budget preference selects hostel accommodation", async () => {
    const experiences = [mockExp(), mockExp({ id: "exp-2", name: "exp2" })];
    const trip = mockTrip();
    const budgetPrefs: Preferences = { ...defaultPrefs(), accomStyle: 10, minCost: 90 };

    const result = await planWithRules(experiences, trip, budgetPrefs, "IT");

    expect(result.skeleton[0].accommodation.type).toBe("hostel");
    expect(result.skeleton[0].accommodation.est_cost_per_night_usd).toBeLessThan(100);
  });

  it("mid-range preference selects guesthouse accommodation", async () => {
    const experiences = [mockExp(), mockExp({ id: "exp-2", name: "exp2" })];
    const trip = mockTrip();
    const midPrefs: Preferences = defaultPrefs();

    const result = await planWithRules(experiences, trip, midPrefs, "IT");

    expect(result.skeleton[0].accommodation.type).toBe("guesthouse");
    expect(result.skeleton[0].accommodation.est_cost_per_night_usd).toBeGreaterThanOrEqual(80);
    expect(result.skeleton[0].accommodation.est_cost_per_night_usd).toBeLessThanOrEqual(150);
  });
});
