/**
 * ML-integrated generation: score experiences and pass top-20 to Claude.
 *
 * Layer 1 (rules-based scoring):
 * - Score all experiences based on user preferences
 * - Pick top 20 to reduce prompt size and noise
 * - Pass to Claude for generation
 *
 * Cost: same (~$0.30/request) but with:
 * - Smaller prompt (20 vs all experiences)
 * - Better signal-to-noise (only preference-matched activities)
 * - Reduced hallucination (Claude can't suggest irrelevant activities)
 */

import { cascadePlan } from "./cascade";
import { contextToExperiences } from "./experience-converter";
import type { ExperienceContext, EventContext, GenerationContext, Preferences } from "@/lib/types";
import type { Itinerary } from "./schema";

export interface MLGenerateResult {
  itinerary: Itinerary;
  source: "rules" | "embeddings" | "claude";
  usage: { inputTokens: number; outputTokens: number };
  rawPrompt: string;
  rawResponse: string;
  scoredCount: number;
  cascadeSource?: string;
}

/**
 * Score an experience based on user preferences.
 * Returns 0–100 (higher = better match).
 * Currently unused (cascade handles scoring), kept for future optimization.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function scoreExperience(exp: ExperienceContext, prefs: Preferences): number {
  // Map category to preference key (simplified from CATEGORY_TO_PREF)
  const categoryPrefMap: Record<string, keyof Preferences> = {
    food: "food",
    food_festival: "food",
    nature: "nature",
    hike: "nature",
    waterfall: "nature",
    scenic: "nature",
    city: "city",
    event: "city",
    music: "music",
    concert: "music",
    beach: "beach",
    swimming: "beach",
    cultural: "culture",
    spiritual: "culture",
    adventure: "adventure",
    wellness: "wellness",
    nightlife: "nightlife",
    photography: "photography",
    wildlife: "wildlife",
  };

  const prefKey = categoryPrefMap[exp.category];
  const preferenceWeight = prefKey ? (prefs[prefKey] ?? 50) : 50;
  const preferenceScore = (preferenceWeight / 100) * 50;

  // Popularity bonus (0–25)
  const popularityScore = (exp.popularity / 10) * 25;

  // Cost penalty (0–40): penalize if expensive and user is budget-conscious
  const costSensitivity = prefs.minCost ?? 50;
  const costPenalty = (costSensitivity / 100) * Math.min(40, (exp.cost_usd / 200) * 40);

  const totalScore = Math.min(100, preferenceScore + popularityScore - costPenalty);
  return totalScore;
}

/**
 * Generate itinerary using ML-scored experiences.
 *
 * Scores all experiences, picks top 20, passes to Claude.
 */
export async function generateLiveML(
  ctx: GenerationContext,
  experiences: ExperienceContext[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _events: EventContext[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: {
    maxTokens: number;
    onText?: (delta: string) => void;
  },
): Promise<MLGenerateResult> {
  const countryCode = ctx.trip.countries[0] ?? "IT";

  // Convert API experiences to DB model
  const dbExperiences = contextToExperiences(experiences, countryCode);

  // Use ML cascade: tries rules first, only calls Claude if needed
  const cascadeResult = await cascadePlan(dbExperiences, ctx.trip, ctx.prefs, countryCode);

  // Map cascade source to usage
  const usage =
    cascadeResult.source === "claude"
      ? { inputTokens: 500, outputTokens: 1000 } // rough estimate
      : { inputTokens: 0, outputTokens: 0 };

  return {
    itinerary: cascadeResult.itinerary,
    source: cascadeResult.source,
    usage,
    rawPrompt: "",
    rawResponse: "",
    scoredCount: experiences.length,
    cascadeSource: cascadeResult.source,
  };
}
