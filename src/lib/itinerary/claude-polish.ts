/**
 * Layer 3: Claude narrative polish.
 *
 * Takes a rule-generated itinerary skeleton and asks Claude to:
 * - Write engaging day narratives
 * - Add practical tips
 * - Improve pacing suggestions
 * - Keep all activities and cities FIXED (no changes to structure)
 *
 * Cost: ~$0.10 per request (vs $0.30 for full generation)
 * Reason: Claude only writes prose, not complex reasoning
 */

import Anthropic from "@anthropic-ai/sdk";
import { itinerarySchema, type Itinerary, type ItineraryDay } from "./schema";
import type { TripInput, Preferences } from "@/lib/types";

export interface PolishResult {
  itinerary: Itinerary;
  usedInputTokens: number;
  usedOutputTokens: number;
}

/**
 * Build a prompt for Claude to polish a rule-generated skeleton.
 * Activities are locked; Claude only improves prose.
 */
function buildPolishPrompt(
  skeleton: ItineraryDay[],
  trip: TripInput,
  prefs: Preferences,
): string {
  const daysText = skeleton
    .map(
      (day) =>
        `Day ${day.day_number} (${day.date}) in ${day.city}:\n` +
        `Morning: ${day.morning.activity}\n` +
        `Afternoon: ${day.afternoon.activity}\n` +
        `Evening: ${day.evening.activity}`,
    )
    .join("\n\n");

  return `You are a travel writer enhancing an itinerary. The activities are FIXED and must not change.
Your job is to:
1. Write a 1-2 sentence engaging NARRATIVE for each day (why these activities matter)
2. Add 2-3 practical TIPS for each day (best times, what to bring, local customs)
3. Suggest pacing improvements (flag exhausting days, suggest rest breaks)
4. Keep all activities, cities, and costs EXACTLY as planned

Trip context:
- Duration: ${trip.startDate} to ${trip.endDate}
- Budget: $${trip.budget}/day
- Group: ${trip.groupSize} traveler(s)
- Preferences: food=${prefs.food}, nature=${prefs.nature}, adventure=${prefs.adventure}

Current skeleton:
${daysText}

Return ONLY valid JSON matching this exact structure for EACH day:
{
  "day_number": 1,
  "date": "2026-06-20",
  "country": "Portugal",
  "city": "Lisbon",
  "day_theme": "Arrival & Exploration",
  "morning": {
    "activity": "Airport transfer & check-in",
    "location": "Lisbon",
    "duration_hours": 2,
    "cost_usd": 15,
    "tips": "Use metro or pre-booked transfer"
  },
  "afternoon": {
    "activity": "Tram 28 exploration",
    "location": "Alfama",
    "duration_hours": 3,
    "cost_usd": 4,
    "tips": "Take the iconic yellow tram"
  },
  "evening": {
    "activity": "Sunset & dinner",
    "location": "Miradouro da Senhora do Monte",
    "duration_hours": 3,
    "cost_usd": 25,
    "tips": "Walk up for golden hour views"
  },
  "transport_from_previous": null,
  "accommodation": {
    "type": "hotel",
    "name": "Local guesthouse",
    "area": "Bairro Alto",
    "est_cost_per_night_usd": 45
  },
  "daily_total_cost_usd": 89,
  "local_tip": "Grab a Viva Viagem card for unlimited metro/tram access",
  "event_highlight": null
}

Keep your polish focused on narrative and tips. Activities must stay the same.`;
}

/**
 * Polish a rule-generated itinerary using Claude.
 * Adds narratives, tips, and pacing suggestions without changing activities.
 */
export async function polishWithClaude(
  skeleton: ItineraryDay[],
  trip: TripInput,
  prefs: Preferences,
  maxTokens: number = 2000,
): Promise<PolishResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const prompt = buildPolishPrompt(skeleton, trip, prefs);
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in Claude response");
    }

    const polishedDays = JSON.parse(jsonMatch[0]);
    const itinerary = itinerarySchema.parse(polishedDays);

    return {
      itinerary,
      usedInputTokens: message.usage.input_tokens,
      usedOutputTokens: message.usage.output_tokens,
    };
  } catch (err) {
    throw new Error(`Claude polish failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
