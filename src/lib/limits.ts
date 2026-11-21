import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** What the count handler needs. Both checks fail closed: an error means "no". */
export type Guards = {
  /** True when this caller may make another request right now. */
  allowRequest(ip: string): Promise<boolean>;
  /** True when a model call may be spent from this month's budget. */
  takeBudget(): Promise<boolean>;
};

export const PER_MINUTE = 5;
export const PER_DAY = 40;
export const DEFAULT_MONTHLY_CALLS = 800;

/** Minimal Redis surface for the budget counter, so tests can fake it. */
export type CounterStore = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

/** Minimal ratelimiter surface. */
export type RateLimiter = {
  limit(key: string): Promise<{ success: boolean }>;
};

/** Callers are keyed by a hash so raw IPs are never written to Redis. */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function monthKey(now: Date = new Date()): string {
  return `budget:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function createGuards(opts: {
  perMinute: RateLimiter;
  perDay: RateLimiter;
  store: CounterStore;
  monthlyCalls: number;
  now?: () => Date;
}): Guards {
  const now = opts.now ?? (() => new Date());
  return {
    async allowRequest(ip) {
      try {
        const key = await hashIp(ip);
        const [minute, day] = await Promise.all([opts.perMinute.limit(key), opts.perDay.limit(key)]);
        return minute.success && day.success;
      } catch (err) {
        console.error("rate limit check failed:", err instanceof Error ? err.name : "unknown");
        return false;
      }
    },
    async takeBudget() {
      try {
        const key = monthKey(now());
        const used = await opts.store.incr(key);
        // Expire after about 35 days so old months clean themselves up.
        if (used === 1) await opts.store.expire(key, 35 * 24 * 60 * 60);
        return used <= opts.monthlyCalls;
      } catch (err) {
        console.error("budget check failed:", err instanceof Error ? err.name : "unknown");
        return false;
      }
    },
  };
}

/**
 * Build guards from env. Returns null when Upstash is not configured.
 * The route decides what null means (allowed in development, an error in production).
 */
export function guardsFromEnv(env: NodeJS.ProcessEnv = process.env): Guards | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  const redis = Redis.fromEnv();
  const parsed = Number(env.MONTHLY_BUDGET_CALLS);
  const monthlyCalls = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MONTHLY_CALLS;
  return createGuards({
    perMinute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(PER_MINUTE, "1 m"),
      prefix: "rl:min",
    }),
    perDay: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(PER_DAY, "1 d"),
      prefix: "rl:day",
    }),
    store: redis,
    monthlyCalls,
  });
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
