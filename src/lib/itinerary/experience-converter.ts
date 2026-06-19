/**
 * Converts between ExperienceContext (API model) and CountryExperience (DB model).
 * Handles type mismatches and missing fields gracefully.
 */

import type { CountryExperience } from "@prisma/client";
import type { ExperienceContext } from "@/lib/types";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Convert an ExperienceContext (API) to CountryExperience (DB model).
 * For fields missing in the API, uses sensible defaults.
 */
export function contextToExperience(
  ctx: ExperienceContext,
  countryId: string,
): CountryExperience {
  return {
    id: ctx.id,
    countryId,
    name: ctx.name,
    category: ctx.category,
    description: ctx.description,
    locationCity: ctx.city,
    locationLat: new Decimal(ctx.lat),
    locationLng: new Decimal(ctx.lng),
    avgCostUsd: new Decimal(ctx.cost_usd),
    durationHours: new Decimal(ctx.hours),
    bestSeason: [], // Not in API context; defaults to empty (available year-round)
    accessibility: new Decimal(5), // Default: moderate accessibility
    popularityScore: new Decimal(ctx.popularity),
    sourceUrl: null, // Not in API context
    lastVerified: new Date(), // Set to now
    createdAt: new Date(),
  };
}

/**
 * Batch convert ExperienceContext[] to CountryExperience[].
 */
export function contextToExperiences(
  contexts: ExperienceContext[],
  countryId: string,
): CountryExperience[] {
  return contexts.map((ctx) => contextToExperience(ctx, countryId));
}
