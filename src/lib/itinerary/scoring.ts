/**
 * Rule-based experience scoring system.
 * Scores experiences based on user preferences, popularity, seasonality, and cost.
 * Layer 1 of the hybrid cascade: deterministic, fast ($0).
 */

import { CATEGORY_TO_PREF, PrefKey } from "@/lib/constants";
import type { CountryExperience } from "@prisma/client";
import type { Preferences } from "@/lib/types";

export interface ScoredExperience extends CountryExperience {
  score: number;
  scoreBreakdown: {
    preferenceMatch: number;
    popularcity: number;
    seasonalityBonus: number;
    costPenalty: number;
  };
}

/**
 * Score a single experience based on user preferences and metadata.
 * Score range: 0–100 (higher is better).
 *
 * Components:
 * - Preference match (0–50): how well the category aligns with sliders
 * - Popularity (0–25): inherent popularity score from the DB
 * - Seasonality (0–15): bonus if experience is in-season
 * - Cost penalty (0–40): reduced score for expensive experiences if user is budget-conscious
 */
export function scoreExperience(
  experience: CountryExperience,
  prefs: Preferences,
  tripStartDate: string,
): ScoredExperience {
  const category = experience.category as keyof typeof CATEGORY_TO_PREF;
  const prefKey = CATEGORY_TO_PREF[category];

  // 1. Preference match: which slider applies to this category?
  const preferenceWeight = prefKey ? (prefs[prefKey as PrefKey] ?? 50) : 50;
  const preferenceScore = (preferenceWeight / 100) * 50;

  // 2. Popularity bonus (0–25): normalize the DB's popularity_score (0–10) to 0–25
  const popularityScore = (Number(experience.popularityScore) / 10) * 25;

  // 3. Seasonality bonus (0–15): does this experience's best_season match the trip dates?
  let seasonalityBonus = 0;
  const tripMonth = parseInt(tripStartDate.split("-")[1]);
  if (experience.bestSeason && experience.bestSeason.length > 0) {
    const inSeason = experience.bestSeason.some((season) => {
      // Assume bestSeason is like "June", "July", etc.; convert to month number
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ];
      const seasonMonth = monthNames.indexOf(season.toLowerCase()) + 1;
      return seasonMonth === tripMonth;
    });
    if (inSeason) seasonalityBonus = 15;
  }

  // 4. Cost penalty: penalize expensive experiences if user is budget-conscious
  const costSensitivity = prefs.minCost ?? 50; // 0–100; 100 = maximize savings
  const expCost = Number(experience.avgCostUsd) || 0;
  const costPenalty = (costSensitivity / 100) * Math.min(40, (expCost / 200) * 40); // cap at 40

  // 5. Accessibility bonus (optional): slight bump for highly accessible experiences
  const accessibility = Number(experience.accessibility) || 5;
  const accessibilityBonus = (accessibility / 10) * 5; // up to 5 pts

  const totalScore = Math.min(
    100,
    preferenceScore + popularityScore + seasonalityBonus + accessibilityBonus - costPenalty,
  );

  return {
    ...experience,
    score: totalScore,
    scoreBreakdown: {
      preferenceMatch: preferenceScore,
      popularcity: popularityScore,
      seasonalityBonus,
      costPenalty,
    },
  };
}

/**
 * Score a batch of experiences and return sorted (highest first).
 */
export function scoreExperiences(
  experiences: CountryExperience[],
  prefs: Preferences,
  tripStartDate: string,
): ScoredExperience[] {
  return experiences
    .map((exp) => scoreExperience(exp, prefs, tripStartDate))
    .sort((a, b) => b.score - a.score);
}

/**
 * Group scored experiences by city and pick the top N per city.
 * Used to distribute activities across cities and avoid clustering.
 */
export function pickTopPerCity(
  scored: ScoredExperience[],
  topPerCity: number = 3,
): Map<string, ScoredExperience[]> {
  const byCity = new Map<string, ScoredExperience[]>();
  for (const exp of scored) {
    if (!byCity.has(exp.locationCity)) byCity.set(exp.locationCity, []);
    const cityExps = byCity.get(exp.locationCity)!;
    if (cityExps.length < topPerCity) cityExps.push(exp);
  }
  return byCity;
}

/**
 * Calculate the quality score of a generated itinerary (0–10).
 * Used to decide whether to escalate to Claude refinement.
 *
 * Quality metrics:
 * - Average experience score (weighted 0.4)
 * - Coverage variety (different categories; 0.3)
 * - City distribution (3+ cities is ideal; 0.3)
 */
export function calculateItineraryQuality(
  days: Array<{ experiences: ScoredExperience[] }>,
): number {
  if (!days.length) return 0;

  // 1. Average experience score (0–10)
  const allExps = days.flatMap((d) => d.experiences);
  const avgScore = allExps.length ? allExps.reduce((s, e) => s + e.score, 0) / allExps.length / 10 : 0;

  // 2. Category variety (0–10; 10 = all 11 categories represented)
  const categories = new Set(allExps.map((e) => e.category));
  const varietyScore = (categories.size / 11) * 10;

  // 3. City distribution (0–10; 10 = 3+ cities)
  const cities = new Set(allExps.map((e) => e.locationCity));
  const cityScore = Math.min(10, (cities.size / 3) * 10);

  return (avgScore * 0.4 + varietyScore * 0.3 + cityScore * 0.3);
}
