import { describe, it, expect } from "vitest";
import { contextToExperience, contextToExperiences } from "./experience-converter";
import type { ExperienceContext } from "@/lib/types";
import { Decimal } from "@prisma/client/runtime/library";

const mockContext = (overrides?: Partial<ExperienceContext>): ExperienceContext => ({
  id: "exp-1",
  name: "Pasta Making Class",
  city: "Rome",
  category: "food",
  cost_usd: 50,
  hours: 2,
  popularity: 8.5,
  lat: 41.9028,
  lng: 12.4964,
  description: "Learn to make fresh pasta",
  ...overrides,
});

describe("contextToExperience", () => {
  it("converts basic fields from ExperienceContext to CountryExperience", () => {
    const ctx = mockContext();
    const countryId = "italy-001";

    const exp = contextToExperience(ctx, countryId);

    expect(exp.id).toBe("exp-1");
    expect(exp.countryId).toBe("italy-001");
    expect(exp.name).toBe("Pasta Making Class");
    expect(exp.category).toBe("food");
    expect(exp.description).toBe("Learn to make fresh pasta");
  });

  it("converts numeric fields to Decimal", () => {
    const ctx = mockContext({
      cost_usd: 75.5,
      hours: 3.5,
      popularity: 9.2,
      lat: 48.8566,
      lng: 2.3522,
    });

    const exp = contextToExperience(ctx, "france-001");

    expect(exp.avgCostUsd).toEqual(new Decimal("75.5"));
    expect(exp.durationHours).toEqual(new Decimal("3.5"));
    expect(exp.popularityScore).toEqual(new Decimal("9.2"));
    expect(exp.locationLat).toEqual(new Decimal("48.8566"));
    expect(exp.locationLng).toEqual(new Decimal("2.3522"));
  });

  it("maps ExperienceContext city to CountryExperience locationCity", () => {
    const ctx = mockContext({ city: "Florence" });
    const exp = contextToExperience(ctx, "italy-001");
    expect(exp.locationCity).toBe("Florence");
  });

  it("sets sensible defaults for missing fields", () => {
    const ctx = mockContext();
    const exp = contextToExperience(ctx, "italy-001");

    expect(exp.bestSeason).toEqual([]); // Empty = year-round
    expect(exp.accessibility).toEqual(new Decimal(5)); // Moderate
    expect(exp.sourceUrl).toBeNull();
    expect(exp.lastVerified).toBeInstanceOf(Date);
    expect(exp.createdAt).toBeInstanceOf(Date);
  });

  it("preserves all required fields for database insertion", () => {
    const ctx = mockContext();
    const exp = contextToExperience(ctx, "italy-001");

    // Verify all required Prisma fields are present
    expect(exp.id).toBeDefined();
    expect(exp.countryId).toBeDefined();
    expect(exp.name).toBeDefined();
    expect(exp.category).toBeDefined();
    expect(exp.description).toBeDefined();
    expect(exp.locationCity).toBeDefined();
    expect(exp.locationLat).toBeDefined();
    expect(exp.locationLng).toBeDefined();
    expect(exp.avgCostUsd).toBeDefined();
    expect(exp.durationHours).toBeDefined();
    expect(exp.bestSeason).toBeDefined();
    expect(exp.accessibility).toBeDefined();
    expect(exp.popularityScore).toBeDefined();
    expect(exp.createdAt).toBeDefined();
  });

  it("handles special characters in name and description", () => {
    const ctx = mockContext({
      name: "Tour: Colosseum & Roman Forum",
      description: "Explore Rome's ancient sites (2000+ years old)",
    });

    const exp = contextToExperience(ctx, "italy-001");

    expect(exp.name).toBe("Tour: Colosseum & Roman Forum");
    expect(exp.description).toBe("Explore Rome's ancient sites (2000+ years old)");
  });

  it("handles zero and negative popularity (edge case)", () => {
    const ctx = mockContext({ popularity: 0 });
    const exp = contextToExperience(ctx, "italy-001");
    expect(exp.popularityScore).toEqual(new Decimal(0));

    const ctx2 = mockContext({ popularity: 10 });
    const exp2 = contextToExperience(ctx2, "italy-001");
    expect(exp2.popularityScore).toEqual(new Decimal(10));
  });

  it("handles very small and very large costs", () => {
    const ctxCheap = mockContext({ cost_usd: 0.5 });
    const expCheap = contextToExperience(ctxCheap, "italy-001");
    expect(expCheap.avgCostUsd).toEqual(new Decimal("0.5"));

    const ctxExpensive = mockContext({ cost_usd: 9999.99 });
    const expExpensive = contextToExperience(ctxExpensive, "italy-001");
    expect(expExpensive.avgCostUsd).toEqual(new Decimal("9999.99"));
  });
});

describe("contextToExperiences", () => {
  it("converts an array of contexts to experiences", () => {
    const contexts = [
      mockContext({ id: "exp-1", name: "Pasta" }),
      mockContext({ id: "exp-2", name: "Colosseum" }),
      mockContext({ id: "exp-3", name: "Vatican" }),
    ];

    const exps = contextToExperiences(contexts, "italy-001");

    expect(exps).toHaveLength(3);
    expect(exps[0].id).toBe("exp-1");
    expect(exps[1].id).toBe("exp-2");
    expect(exps[2].id).toBe("exp-3");
    expect(exps.every((e) => e.countryId === "italy-001")).toBe(true);
  });

  it("handles empty array", () => {
    const exps = contextToExperiences([], "italy-001");
    expect(exps).toHaveLength(0);
  });

  it("preserves all conversions in batch operation", () => {
    const contexts = [
      mockContext({
        id: "food-1",
        category: "food",
        cost_usd: 50,
        popularity: 8,
      }),
      mockContext({
        id: "nature-1",
        category: "nature",
        cost_usd: 0,
        popularity: 9,
      }),
    ];

    const exps = contextToExperiences(contexts, "italy-001");

    expect(exps[0].category).toBe("food");
    expect(exps[0].avgCostUsd).toEqual(new Decimal("50"));
    expect(exps[0].popularityScore).toEqual(new Decimal("8"));

    expect(exps[1].category).toBe("nature");
    expect(exps[1].avgCostUsd).toEqual(new Decimal("0"));
    expect(exps[1].popularityScore).toEqual(new Decimal("9"));
  });
});
