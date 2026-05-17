import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/**
 * Try to return a cached value; on miss, compute, store, and return it.
 * Never throws — if Redis is unavailable we fall back to compute() silently.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) {
      return hit;
    }
  } catch (err) {
    console.warn("[redis] cache GET failed, falling back to compute:", err);
  }

  const value = await compute();

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn("[redis] cache SET failed:", err);
  }

  return value;
}

/**
 * Invalidate the analytics cache for a specific user.
 * Fire-and-forget — never throws.
 */
export async function invalidateUserAnalytics(userId: string): Promise<void> {
  try {
    await redis.del(`analytics:${userId}`);
  } catch (err) {
    console.warn("[redis] invalidateUserAnalytics failed:", err);
  }
}
