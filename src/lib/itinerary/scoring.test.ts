import { describe, it, expect } from "vitest";
import { scoreExperience, scoreExperiences, pickTopPerCity, calculateItineraryQuality } from "./scoring";
import { DEFAULT_PREFS } from "@/lib/constants";
import type { CountryExperience } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const mockExperience = (overrides?: Partial<CountryExperience>): CountryExperience => ({
  id: "exp-1",
  countryId: "it-1",
  category: "food",
  name: "Pasta Making Class",
  description: "Learn to make pasta",
  locationCity: "Rome",
  locationLat: new Decimal("41.9028"),
  locationLng: new Decimal("12.4964"),
  avgCostUsd: new Decimal("50"),
  durationHours: new Decimal("2"),
  bestSeason: ["May", "June", "September"],
  accessibility: new Decimal("8"),
  popularityScore: new Decimal("8"),
  sourceUrl: "https://example.com",
  lastVerified: new Date(),
  createdAt: new Date(),
  ...overrides,
});

describe("scoreExperience", () => {
  it("scores a food experience higher when food preference is high", () => {
    const exp = mockExperience();
    const highFoodPrefs = { ...DEFAULT_PREFS, food: 100 };
    const lowFoodPrefs = { ...DEFAULT_PREFS, food: 0 };

    const highScore = scoreExperience(exp, highFoodPrefs, "2026-06-15", "2026-06-22");
    const lowScore = scoreExperience(exp, lowFoodPrefs, "2026-06-15", "2026-06-22");

    expect(highScore.score).toBeGreaterThan(lowScore.score);
  });

  it("penalizes expensive experiences when budget sensitivity is high", () => {
    const expCheap = mockExperience({ avgCostUsd: new Decimal("20") });
    const expExpensive = mockExperience({ avgCostUsd: new Decimal("200") });
    const budgetSensitivePrefs = { ...DEFAULT_PREFS, minCost: 100 };

    const cheapScore = scoreExperience(expCheap, budgetSensitivePrefs, "2026-06-15", "2026-06-22");
    const expensiveScore = scoreExperience(expExpensive, budgetSensitivePrefs, "2026-06-15", "2026-06-22");

    expect(cheapScore.score).toBeGreaterThan(expensiveScore.score);
  });

  it("gives seasonality bonus for in-season experiences", () => {
    const exp = mockExperience({ bestSeason: ["June", "July"] });
    const juneDate = "2026-06-15"; // June trip
    const decemberDate = "2026-12-15"; // December trip

    const juneScore = scoreExperience(exp, DEFAULT_PREFS, juneDate, "2026-06-22");
    const decScore = scoreExperience(exp, DEFAULT_PREFS, decemberDate, "2026-12-22");

    expect(juneScore.score).toBeGreaterThan(decScore.score);
  });

  it("returns a score between 0 and 100", () => {
    const exp = mockExperience();
    const score = scoreExperience(exp, DEFAULT_PREFS, "2026-06-15", "2026-06-22");
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
  });
});

describe("scoreExperiences", () => {
  it("sorts experiences by score descending", () => {
    const exps = [
      mockExperience({ name: "Cheap Food", avgCostUsd: new Decimal("20"), popularityScore: new Decimal("5") }),
      mockExperience({ name: "Expensive Food", avgCostUsd: new Decimal("200"), popularityScore: new Decimal("9") }),
    ];
    const budgetPrefs = { ...DEFAULT_PREFS, minCost: 100, food: 100 };

    const scored = scoreExperiences(exps, budgetPrefs, "2026-06-15", "2026-06-22");
    expect(scored[0].name).toBe("Cheap Food"); // cheaper + better budget match
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
  });
});

describe("pickTopPerCity", () => {
  it("picks the top N experiences per city", () => {
    const exps = [
      {
        ...mockExperience({ name: "Rome 1", locationCity: "Rome", popularityScore: new Decimal("9") }),
        score: 90,
        scoreBreakdown: { preferenceMatch: 50, popularcity: 25, seasonalityBonus: 15, costPenalty: 0 },
      },
      {
        ...mockExperience({ name: "Rome 2", locationCity: "Rome", popularityScore: new Decimal("7") }),
        score: 70,
        scoreBreakdown: { preferenceMatch: 50, popularcity: 20, seasonalityBonus: 0, costPenalty: 0 },
      },
      {
        ...mockExperience({ name: "Rome 3", locationCity: "Rome", popularityScore: new Decimal("5") }),
        score: 50,
        scoreBreakdown: { preferenceMatch: 40, popularcity: 10, seasonalityBonus: 0, costPenalty: 0 },
      },
      {
        ...mockExperience({ name: "Florence 1", locationCity: "Florence", popularityScore: new Decimal("8") }),
        score: 80,
        scoreBreakdown: { preferenceMatch: 50, popularcity: 25, seasonalityBonus: 5, costPenalty: 0 },
      },
    ];

    const grouped = pickTopPerCity(exps as any, 2);
    expect(grouped.get("Rome")).toHaveLength(2);
    expect(grouped.get("Florence")).toHaveLength(1);
    expect(grouped.get("Rome")?.[0].name).toBe("Rome 1"); // highest score first
  });
});

describe("calculateItineraryQuality", () => {
  it("returns a score between 0 and 10", () => {
    const days = [
      {
        experiences: [
          {
            ...mockExperience(),
            score: 80,
            scoreBreakdown: { preferenceMatch: 50, popularcity: 25, seasonalityBonus: 5, costPenalty: 0 },
          },
        ],
      },
    ];

    const quality = calculateItineraryQuality(days as any);
    expect(quality).toBeGreaterThanOrEqual(0);
    expect(quality).toBeLessThanOrEqual(10);
  });

  it("gives higher quality scores to itineraries with more variety", () => {
    const singleCategoryDay = [
      {
        experiences: [
          {
            ...mockExperience({ category: "food" }),
            score: 80,
            scoreBreakdown: { preferenceMatch: 50, popularcity: 25, seasonalityBonus: 5, costPenalty: 0 },
          },
          {
            ...mockExperience({ category: "food" }),
            score: 75,
            scoreBreakdown: { preferenceMatch: 50, popularcity: 20, seasonalityBonus: 5, costPenalty: 0 },
          },
        ],
      },
    ];

    const multiCategoryDay = [
      {
        experiences: [
          {
            ...mockExperience({ category: "food" }),
            score: 80,
            scoreBreakdown: { preferenceMatch: 50, popularcity: 25, seasonalityBonus: 5, costPenalty: 0 },
          },
          {
            ...mockExperience({ category: "nature" }),
            score: 75,
            scoreBreakdown: { preferenceMatch: 50, popularcity: 20, seasonalityBonus: 5, costPenalty: 0 },
          },
          {
            ...mockExperience({ category: "culture" }),
            score: 70,
            scoreBreakdown: { preferenceMatch: 50, popularcity: 15, seasonalityBonus: 5, costPenalty: 0 },
          },
        ],
      },
    ];

    const singleQuality = calculateItineraryQuality(singleCategoryDay as any);
    const multiQuality = calculateItineraryQuality(multiCategoryDay as any);

    expect(multiQuality).toBeGreaterThan(singleQuality);
  });
});
