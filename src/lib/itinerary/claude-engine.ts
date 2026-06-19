import Anthropic from "@anthropic-ai/sdk";
import { buildItineraryPrompt } from "@/lib/itinerary/prompt";
import { itinerarySchema, type Itinerary } from "@/lib/itinerary/schema";
import { GUARDRAILS } from "@/lib/itinerary/guardrails";
import type {
  GenerationContext,
  ExperienceContext,
  EventContext,
} from "@/lib/types";

/**
 * Live generation via the Anthropic API (server-side only). The model id is
 * env-configurable and defaults to a Haiku-class model to keep cost low; bump
 * ANTHROPIC_MODEL to a Sonnet-class id for higher-quality itineraries.
 *
 * Validation: the response is parsed with Zod; on failure we retry exactly once
 * with the validation error appended (per CLAUDE.md), then give up so the caller
 * can fall back to the mock engine.
 */

export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export interface LiveResult {
  itinerary: Itinerary;
  usage: { inputTokens: number; outputTokens: number };
  rawPrompt: string;
  rawResponse: string;
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

function extractJsonArray(text: string): unknown {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("no JSON array found in response");
  return JSON.parse(clean.slice(start, end + 1));
}

async function callModel(
  client: Anthropic,
  prompt: string,
  maxTokens: number,
  onText?: (delta: string) => void,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  if (onText) stream.on("text", onText);

  const final = await stream.finalMessage();
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    text,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  };
}

export async function generateLive(
  ctx: GenerationContext,
  experiences: ExperienceContext[],
  events: EventContext[],
  opts: {
    maxTokens?: number;
    dayStart?: number;
    dayEnd?: number;
    lockedSummary?: string;
    customPrompt?: string;
    onText?: (delta: string) => void;
  } = {},
): Promise<LiveResult> {
  const client = getClient();
  const maxTokens = opts.maxTokens ?? GUARDRAILS.liveMaxTokens;

  // If custom prompt is provided (e.g., for ML polish), use it; otherwise build standard prompt
  const basePrompt = opts.customPrompt || buildItineraryPrompt(ctx, experiences, events, {
    dayStart: opts.dayStart,
    dayEnd: opts.dayEnd,
    lockedSummary: opts.lockedSummary,
  });

  let prompt = basePrompt;
  let inputTokens = 0;
  let outputTokens = 0;
  let rawResponse = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callModel(client, prompt, maxTokens, opts.onText);
    inputTokens += res.inputTokens;
    outputTokens += res.outputTokens;
    rawResponse = res.text;

    try {
      const parsed = itinerarySchema.parse(extractJsonArray(res.text));
      return {
        itinerary: parsed,
        usage: { inputTokens, outputTokens },
        rawPrompt: basePrompt,
        rawResponse,
      };
    } catch (err) {
      if (attempt === 1) throw err;
      // Retry once with the validation error appended.
      const message = err instanceof Error ? err.message : String(err);
      prompt = `${basePrompt}\n\nYour previous response failed validation: ${message}\nReturn ONLY the corrected raw JSON array.`;
    }
  }

  throw new Error("unreachable");
}
