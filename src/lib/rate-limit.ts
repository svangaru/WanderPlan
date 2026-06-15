import { getRedis } from "@/lib/redis";

/**
 * Fixed-window counter. Backed by Redis when available, otherwise an in-process
 * Map (good enough for single-instance dev; production should run Redis).
 *
 * Returns the count *after* incrementing and whether the limit was exceeded.
 */

interface MemoryEntry {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, MemoryEntry>();

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: number; // epoch ms
}

export async function hitRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;
  const redis = getRedis();

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      const ttl = await redis.ttl(key);
      return {
        allowed: count <= limit,
        count,
        limit,
        resetAt: ttl > 0 ? now + ttl * 1000 : resetAt,
      };
    } catch {
      // fall through to in-memory on any Redis error
    }
  }

  const existing = memoryStore.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: 1 <= limit, count: 1, limit, resetAt };
  }
  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    count: existing.count,
    limit,
    resetAt: existing.resetAt,
  };
}
