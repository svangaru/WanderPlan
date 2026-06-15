import { prisma } from "@/lib/prisma";
import { hitRateLimit } from "@/lib/rate-limit";

/**
 * Cost guardrails for AI generation. These exist to keep the Anthropic bill
 * bounded and to stop a single user from hammering the API key:
 *
 *  - DAILY_FULL_GENERATIONS / DAILY_DAY_REGENERATIONS cap calls per user/day.
 *  - MAX_LIVE_DAYS forces the cheap mock engine for very long trips so we never
 *    send an enormous prompt/response to the live model.
 *  - LIVE_MAX_TOKENS bounds the output budget per call.
 *
 * All knobs are overridable via env so they can be tuned without a deploy.
 */

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const GUARDRAILS = {
  dailyFullGenerations: envInt("GEN_DAILY_FULL_LIMIT", 10),
  dailyDayRegenerations: envInt("GEN_DAILY_DAY_LIMIT", 40),
  /** Trips longer than this never use the live engine (cost ceiling). */
  maxLiveDays: envInt("GEN_MAX_LIVE_DAYS", 21),
  /** Output token budget for a full live generation. */
  liveMaxTokens: envInt("GEN_LIVE_MAX_TOKENS", 8000),
  /** Output token budget for a single-day regeneration. */
  liveDayMaxTokens: envInt("GEN_LIVE_DAY_MAX_TOKENS", 1500),
} as const;

export type GenerationKind = "full" | "day";

export class QuotaExceededError extends Error {
  resetAt: number;
  constructor(message: string, resetAt: number) {
    super(message);
    this.name = "QuotaExceededError";
    this.resetAt = resetAt;
  }
}

/**
 * Throws QuotaExceededError if the user is over their daily cap for `kind`.
 * Called BEFORE any token-spending work so we reject early and for free.
 */
export async function assertWithinQuota(userId: string, kind: GenerationKind): Promise<void> {
  const limit =
    kind === "full" ? GUARDRAILS.dailyFullGenerations : GUARDRAILS.dailyDayRegenerations;
  const key = `gen:${kind}:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const result = await hitRateLimit(key, limit, 24 * 60 * 60);
  if (!result.allowed) {
    throw new QuotaExceededError(
      `Daily ${kind === "full" ? "itinerary" : "day-regeneration"} limit reached (${limit}/day). Try again tomorrow.`,
      result.resetAt,
    );
  }
}

/** Whether a trip of `totalDays` may use the live engine under the cost ceiling. */
export function liveAllowedForLength(totalDays: number): boolean {
  return totalDays <= GUARDRAILS.maxLiveDays;
}

/** Rough Anthropic cost estimate (Haiku-class pricing) for logging only. */
function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const inPerM = Number(process.env.MODEL_INPUT_USD_PER_MTOK ?? "1.0");
  const outPerM = Number(process.env.MODEL_OUTPUT_USD_PER_MTOK ?? "5.0");
  return (inputTokens / 1_000_000) * inPerM + (outputTokens / 1_000_000) * outPerM;
}

/** Durable audit row for every generation attempt (success or fallback). */
export async function logGeneration(params: {
  userId: string;
  tripId?: string | null;
  kind: GenerationKind;
  engine: "mock" | "live";
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  const inputTokens = params.inputTokens ?? 0;
  const outputTokens = params.outputTokens ?? 0;
  await prisma.generationLog.create({
    data: {
      userId: params.userId,
      tripId: params.tripId ?? null,
      kind: params.kind,
      engine: params.engine,
      inputTokens,
      outputTokens,
      costUsd: estimateCostUsd(inputTokens, outputTokens),
    },
  });
}
