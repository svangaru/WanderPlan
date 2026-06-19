/**
 * Embeddings-based experience refinement (Layer 2).
 *
 * Uses OpenAI's text-embedding-3-small to find semantically similar experiences.
 * When rule-generated itinerary has low quality, this swaps activities for
 * better semantic matches based on user preferences and trip context.
 */

import type { ExperienceContext } from "@/lib/types";

// Placeholder for OpenAI client (would need to be initialized in production)
// For now, returns experiences as-is since embeddings infrastructure isn't in place

/**
 * Score similarity between user preferences and an experience.
 * Uses category matching + popularity as proxy for embeddings.
 *
 * In production, this would use actual vector embeddings:
 * - Embed user preferences + experience descriptions
 * - Compute cosine similarity
 * - Return similarity score (0–1)
 */
export function computeSimilarity(
  experience: ExperienceContext,
  preferenceContext: string,
  userPreferences: Record<string, number>,
): number {
  // Placeholder implementation using category + popularity
  // Real implementation would use OpenAI embeddings API

  // For now, return a simple heuristic based on popularity
  // Higher popularity + matching category = higher similarity
  const baseScore = experience.popularity / 10; // 0-1
  return Math.min(1, baseScore * 1.2); // Boost high-popularity items
}

/**
 * Find alternative experiences similar to a target experience.
 * Used when rule-based plan has low-quality activities.
 */
export function findSimilarExperiences(
  targetExperience: ExperienceContext,
  candidates: ExperienceContext[],
  maxResults: number = 3,
): ExperienceContext[] {
  // Placeholder: return candidates sorted by popularity
  // Real implementation would use vector similarity

  return candidates
    .filter((c) => c.category === targetExperience.category)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, maxResults);
}

/**
 * Refine experiences in a day by swapping low-quality ones for better matches.
 * Layer 2: uses similarity search (embeddings simulation).
 */
export function refineExperiencesWithSimilarity(
  experienceIds: string[],
  allExperiences: ExperienceContext[],
  qualityThreshold: number = 5,
): string[] {
  // For now, return original IDs
  // Real implementation would:
  // 1. Find experiences with quality < threshold
  // 2. Search for similar alternatives
  // 3. Swap if better match found

  return experienceIds;
}
