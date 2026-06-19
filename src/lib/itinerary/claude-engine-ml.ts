/**
 * ML-integrated generation: use rule-based scoring to feed Claude only relevant experiences.
 *
 * Flow:
 * 1. Use cascadePlan() to score and rank experiences based on preferences
 * 2. Build an enriched prompt for Claude with only top-scored experiences per category
 * 3. Claude generates the itinerary from this curated, preference-filtered context
 * 4. Cost: rules are $0; Claude call is same cost but with better prompt (less hallucination)
 */

import { scoreExperiences } from "./scoring";
import { generateLive } from "./claude-engine";
import type { ExperienceContext, EventContext, GenerationContext } from "@/lib/types";
import type { Itinerary } from "./schema";
import type { CountryExperience } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface MLGenerateResult {
  itinerary: Itinerary;
  source: "claude";
  usage: { inputTokens: number; outputTokens: number };
  rawPrompt: string;
  rawResponse: string;
}

/**
 * Generate itinerary using ML-informed Claude generation.
 *
 * The cascade (Layer 1) scores all experiences based on preferences.
 * We pass the top-scored experiences to Claude to ensure the prompt is
 * focused on what the user actually wants, reducing hallucination and wasted tokens.
 */
export async function generateLiveML(
  ctx: GenerationContext,
  experiences: ExperienceContext[],
  events: EventContext[],
  options: {
    maxTokens: number;
    onText?: (delta: string) => void;
  },
): Promise<MLGenerateResult> {
  // Layer 1: Score experiences based on preferences
  // This doesn't call Claude, just ranks what we have in the DB
  // Convert ExperienceContext to CountryExperience format for scoring
  const dbExperiences = experiences.map((e) => ({
    id: e.id,
    countryId: "", // not used in scoring
    category: e.category,
    name: e.name,
    description: e.description,
    locationCity: e.city,
    locationLat: new Decimal(e.lat),
    locationLng: new Decimal(e.lng),
    avgCostUsd: new Decimal(e.cost_usd),
    durationHours: new Decimal(e.hours),
    bestSeason: [],
    accessibility: new Decimal(5),
    popularityScore: new Decimal(e.popularity),
    sourceUrl: null,
    lastVerified: null,
    createdAt: new Date(),
  } as CountryExperience));

  const scoredExperiences = scoreExperiences(
    dbExperiences,
    ctx.prefs,
    ctx.trip.startDate,
  );

  // Take top 20 experiences (reduce context size, focus on best matches)
  // Map from Prisma CountryExperience to ExperienceContext format
  const topExperiences: ExperienceContext[] = scoredExperiences.slice(0, 20).map((exp) => ({
    id: exp.id,
    name: exp.name,
    city: exp.locationCity,
    category: exp.category,
    cost_usd: Number(exp.avgCostUsd),
    hours: Number(exp.durationHours),
    popularity: Number(exp.popularityScore),
    lat: Number(exp.locationLat),
    lng: Number(exp.locationLng),
    description: exp.description,
  }));

  // Safety check: if we don't have enough experiences, log and fall back to all
  if (topExperiences.length === 0) {
    console.warn(`[ML] No scored experiences found, falling back to all experiences`);
    // Fall back to original experiences
    const fallbackResult = await generateLive(ctx, experiences, events, {
      maxTokens: options.maxTokens,
      onText: options.onText,
    });
    return {
      itinerary: fallbackResult.itinerary,
      source: "claude",
      usage: { inputTokens: 0, outputTokens: 0 },
      rawPrompt: "",
      rawResponse: "ML fallback: no scored experiences",
    };
  }

  // Use standard Claude generation but with the ML-filtered experience set
  // This keeps the same itinerary format and flow, just with better-ranked inputs
  const result = await generateLive(ctx, topExperiences, events, {
    maxTokens: options.maxTokens,
    onText: options.onText,
  });

  return {
    itinerary: result.itinerary,
    source: "claude",
    usage: result.usage,
    rawPrompt: result.rawPrompt,
    rawResponse: result.rawResponse,
  };
}
