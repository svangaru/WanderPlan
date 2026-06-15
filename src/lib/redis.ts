import Redis from "ioredis";

/**
 * Lazily-created Redis singleton. Optional: when REDIS_URL is unset, callers
 * fall back to in-process behavior (see rate-limit.ts). We never throw on a
 * missing Redis so local dev works without the container.
 */
const globalForRedis = global as unknown as { redis?: Redis | null };

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;

  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: false,
    // Don't crash the process if Redis is down; rate-limiting degrades gracefully.
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
  });
  client.on("error", () => {
    /* swallow — callers treat a dead client as "no redis" */
  });

  globalForRedis.redis = client;
  return client;
}
