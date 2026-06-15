import { requireUserId, HttpError } from "@/lib/api/session";
import { generateSchema } from "@/lib/api/schemas";
import { loadOwnedTrip } from "@/lib/api/trips";
import { dbToTripInput, dbToPrefs } from "@/lib/trip-mapping";
import { assembleGroundingContext } from "@/lib/itinerary/grounding";
import { generateItinerary } from "@/lib/itinerary/generate";
import { persistItinerary } from "@/lib/itinerary/persist";
import {
  assertWithinQuota,
  logGeneration,
  QuotaExceededError,
} from "@/lib/itinerary/guardrails";
import { DEFAULT_MODEL } from "@/lib/itinerary/claude-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Streams itinerary generation progress to the client over SSE, then persists
 * the result and emits a final `done` event with the itinerary id.
 *
 * Cost guardrails run BEFORE any token-spending work: unauthenticated and
 * over-quota requests are rejected for free, and the orchestrator forces the
 * mock engine when live isn't allowed.
 */
export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 401;
    return Response.json({ error: "Sign in required" }, { status });
  }

  const { tripId, engine } = generateSchema.parse(await req.json());

  const trip = await loadOwnedTrip(userId, tripId);
  if (!trip) return Response.json({ error: "Trip not found" }, { status: 404 });

  try {
    await assertWithinQuota(userId, "full");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return Response.json({ error: err.message, resetAt: err.resetAt }, { status: 429 });
    }
    throw err;
  }

  const tripInput = dbToTripInput(trip, trip.preferences);
  const prefs = dbToPrefs(trip.preferences);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        send({ type: "phase", message: "Querying country_experiences…", progress: 0.1 });
        const { experiences, events } = await assembleGroundingContext(
          tripInput.countries,
          tripInput.startDate,
          tripInput.endDate,
        );

        send({ type: "phase", message: "Weighting experiences against your sliders…", progress: 0.3 });
        send({ type: "phase", message: "Routing cities to minimize backtracking…", progress: 0.5 });

        const result = await generateItinerary(
          { trip: tripInput, prefs },
          experiences,
          events,
          engine,
          () => send({ type: "phase", message: "Drafting your days…", progress: 0.7 }),
        );

        send({ type: "phase", message: "Saving your itinerary…", progress: 0.9 });
        const itineraryId = await persistItinerary({
          tripId,
          itinerary: result.itinerary,
          modelVersion:
            result.engine === "live" ? process.env.ANTHROPIC_MODEL || DEFAULT_MODEL : "mock",
          rawPrompt: result.rawPrompt,
          rawResponse: result.rawResponse,
          experiences,
          events,
        });

        await logGeneration({
          userId,
          tripId,
          kind: "full",
          engine: result.engine,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        });

        send({
          type: "done",
          itineraryId,
          engine: result.engine,
          fallbackReason: result.fallbackReason ?? null,
          progress: 1,
        });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Generation failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
