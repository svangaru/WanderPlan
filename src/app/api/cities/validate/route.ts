import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * Validates a free-typed city against OpenStreetMap's Nominatim geocoder
 * (free, no API key — fits the low-cost goal). Scoped to the trip's country.
 * Results are cached 30 days in Redis to stay well within Nominatim's usage
 * policy. Validation is advisory: on any error we return valid:null so the UI
 * can let the user proceed rather than block on a flaky third party.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const country = (searchParams.get("country") ?? "").trim().toLowerCase();
  if (q.length < 2 || country.length !== 2) {
    return NextResponse.json({ valid: false });
  }

  const cacheKey = `city:${country}:${q.toLowerCase()}`;
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(JSON.parse(cached));
    } catch {
      /* ignore cache miss/errors */
    }
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&featuretype=city` +
      `&city=${encodeURIComponent(q)}&countrycodes=${country}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WanderPlan/1.0 (travel planner demo)" },
      // Nominatim is slow-ish; cap the wait.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ valid: null });
    const rows = (await res.json()) as Array<{ display_name?: string }>;
    const hit = rows[0];
    const result = hit
      ? { valid: true, displayName: hit.display_name ?? q }
      : { valid: false };

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), "EX", 60 * 60 * 24 * 30);
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json(result);
  } catch {
    // Network/timeout — let the UI treat as "couldn't verify" (non-blocking).
    return NextResponse.json({ valid: null });
  }
}
