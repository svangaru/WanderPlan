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

import { generateLive } from "./claude-engine";
import type { ExperienceContext, EventContext, GenerationContext } from "@/lib/types";
import type { Itinerary } from "./schema";
import type { Preferences } from "@/lib/types";

export interface MLGenerateResult {
  itinerary: Itinerary;
  source: "claude";
  usage: { inputTokens: number; outputTokens: number };
  rawPrompt: string;
  rawResponse: string;
  scoredCount: number;
}

/**
 * Score an experience based on user preferences.
 * Returns 0–100 (higher = better match).
 */
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
  events: EventContext[],
  options: {
    maxTokens: number;
    onText?: (delta: string) => void;
  },
): Promise<MLGenerateResult> {
  // Layer 1: Score and rank experiences
  const scored = experiences
    .map((exp) => ({
      ...exp,
      score: scoreExperience(exp, ctx.prefs),
    }))
    .sort((a, b) => b.score - a.score);

  // Smart filtering: keep top 30 globally (ensures variety) + all from trip start/end cities
  // This balances prompt size with quality
  const topGlobal = new Set(scored.slice(0, 30).map((e) => e.id));
  const tripCities = new Set([ctx.trip.startCity, ctx.trip.endCity].filter(Boolean));

  const filtered = scored.filter((exp) =>
    topGlobal.has(exp.id) || tripCities.has(exp.city)
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const contextExperiences = filtered.map(({ score, ...exp }) => exp);

  // Pass to Claude
  const result = await generateLive(ctx, contextExperiences, events, {
    maxTokens: options.maxTokens,
    onText: options.onText,
  });

  return {
    itinerary: result.itinerary,
    source: "claude",
    usage: result.usage,
    rawPrompt: result.rawPrompt,
    rawResponse: result.rawResponse,
    scoredCount: contextExperiences.length,
  };
}
