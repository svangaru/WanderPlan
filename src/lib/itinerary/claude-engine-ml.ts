/**
 * ML-integrated generation: use Claude with all available experiences.
 *
 * Currently passes all experiences to Claude. Future: add scoring layer to filter
 * to top-20 experiences based on preferences.
 */

import { generateLive } from "./claude-engine";
import type { ExperienceContext, EventContext, GenerationContext } from "@/lib/types";
import type { Itinerary } from "./schema";

export interface MLGenerateResult {
  itinerary: Itinerary;
  source: "claude";
  usage: { inputTokens: number; outputTokens: number };
  rawPrompt: string;
  rawResponse: string;
}

/**
 * Generate itinerary using Claude generation.
 *
 * TODO: Layer 1 (scoring) will filter to top-20 experiences based on preferences.
 * For now, passing all experiences to get Claude working first.
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
  const result = await generateLive(ctx, experiences, events, {
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
