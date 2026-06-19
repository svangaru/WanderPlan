import { daysBetween } from "@/lib/dates";
import { mockGenerate } from "@/lib/itinerary/mock-engine";
import { generateLiveML } from "@/lib/itinerary/claude-engine-ml";
import { liveAllowedForLength, GUARDRAILS } from "@/lib/itinerary/guardrails";
import type { Itinerary } from "@/lib/itinerary/schema";
import type {
  GenerationContext,
  ExperienceContext,
  EventContext,
  GenerationEngine,
} from "@/lib/types";

/**
 * Resolves which engine to use. `mock` is the dev/zero-cost default. Even in
 * `live` mode we force `mock` when the API key is missing or the trip exceeds
 * the live-day cost ceiling — so we never make an expensive or doomed call.
 */
export function resolveEngine(requested: GenerationEngine, totalDays: number): GenerationEngine {
  const configured = (process.env.GENERATION_ENGINE as GenerationEngine) || "mock";
  const wantLive = requested === "live" && configured === "live";
  if (!wantLive) return "mock";
  if (!process.env.ANTHROPIC_API_KEY) return "mock";
  if (!liveAllowedForLength(totalDays)) return "mock";
  return "live";
}

export interface GenerateResult {
  itinerary: Itinerary;
  engine: GenerationEngine;
  usage: { inputTokens: number; outputTokens: number };
  rawPrompt: string;
  rawResponse: string;
  /** Set when live was requested but we fell back to mock. */
  fallbackReason?: string;
}

/**
 * Generates a full itinerary. Tries the live engine when allowed and falls back
 * to the deterministic mock engine on any error, so the user always gets a
 * result and a transient API failure never blocks planning.
 */
export async function generateItinerary(
  ctx: GenerationContext,
  experiences: ExperienceContext[],
  events: EventContext[],
  requested: GenerationEngine,
  onText?: (delta: string) => void,
): Promise<GenerateResult> {
  const totalDays = daysBetween(ctx.trip.startDate, ctx.trip.endDate);
  const countryCode = ctx.trip.countries[0] ?? "IT";
  const engine = resolveEngine(requested, totalDays);

  const mockResult = (fallbackReason?: string): GenerateResult => ({
    itinerary: mockGenerate(ctx, experiences, events, countryCode),
    engine: "mock",
    usage: { inputTokens: 0, outputTokens: 0 },
    rawPrompt: "",
    rawResponse: "",
    fallbackReason,
  });

  if (engine === "mock") return mockResult();

  try {
    // Use ML cascade: score experiences and feed top ones to Claude
    const mlResult = await generateLiveML(ctx, experiences, events, {
      maxTokens: GUARDRAILS.liveMaxTokens,
      onText,
    });
    return {
      itinerary: mlResult.itinerary,
      engine: "live", // Still uses Claude, but with ML-ranked inputs
      usage: mlResult.usage,
      rawPrompt: mlResult.rawPrompt,
      rawResponse: mlResult.rawResponse,
    };
  } catch (err) {
    return mockResult(err instanceof Error ? err.message : "ML generation failed");
  }
}
