import { describe, expect, it, vi } from "vitest";
import {
  clientIp,
  createGuards,
  guardsFromEnv,
  hashIp,
  monthKey,
  type CounterStore,
  type RateLimiter,
} from "./limits";

const allow: RateLimiter = { limit: async () => ({ success: true }) };
const deny: RateLimiter = { limit: async () => ({ success: false }) };

function memoryStore(): CounterStore & { counts: Map<string, number>; expires: string[] } {
  const counts = new Map<string, number>();
  const expires: string[] = [];
  return {
    counts,
    expires,
    async incr(key) {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return n;
    },
    async expire(key) {
      expires.push(key);
    },
  };
}

describe("monthKey", () => {
  it("uses UTC year and zero-padded month", () => {
    expect(monthKey(new Date("2026-03-05T10:00:00Z"))).toBe("budget:2026-03");
    expect(monthKey(new Date("2026-12-31T23:59:59Z"))).toBe("budget:2026-12");
  });
});

describe("hashIp", () => {
  it("is stable, hides the raw IP, and differs per IP", async () => {
    const a = await hashIp("203.0.113.7");
    expect(a).toBe(await hashIp("203.0.113.7"));
    expect(a).not.toContain("203");
    expect(a).not.toBe(await hashIp("203.0.113.8"));
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip, then the first x-forwarded-for entry, then unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("allowRequest", () => {
  it("allows only when both windows allow", async () => {
    const store = memoryStore();
    const ok = createGuards({ perMinute: allow, perDay: allow, store, monthlyCalls: 10 });
    expect(await ok.allowRequest("1.1.1.1")).toBe(true);
    expect(await createGuards({ perMinute: deny, perDay: allow, store, monthlyCalls: 10 }).allowRequest("x")).toBe(false);
    expect(await createGuards({ perMinute: allow, perDay: deny, store, monthlyCalls: 10 }).allowRequest("x")).toBe(false);
  });

  it("keys the limiter by hash, not the raw IP", async () => {
    const limit = vi.fn(async (key: string) => {
      void key;
      return { success: true };
    });
    const g = createGuards({ perMinute: { limit }, perDay: { limit }, store: memoryStore(), monthlyCalls: 10 });
    await g.allowRequest("203.0.113.7");
    const key = limit.mock.calls[0][0];
    expect(key).not.toContain("203.0.113.7");
  });

  it("fails closed when Redis errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: RateLimiter = {
      limit: async () => {
        throw new Error("redis down");
      },
    };
    const g = createGuards({ perMinute: broken, perDay: allow, store: memoryStore(), monthlyCalls: 10 });
    expect(await g.allowRequest("x")).toBe(false);
  });
});

describe("takeBudget", () => {
  it("allows up to the monthly cap, then refuses", async () => {
    const store = memoryStore();
    const g = createGuards({ perMinute: allow, perDay: allow, store, monthlyCalls: 3 });
    expect([await g.takeBudget(), await g.takeBudget(), await g.takeBudget()]).toEqual([true, true, true]);
    expect(await g.takeBudget()).toBe(false);
  });

  it("starts a fresh counter in a new month", async () => {
    const store = memoryStore();
    let now = new Date("2026-11-30T12:00:00Z");
    const g = createGuards({ perMinute: allow, perDay: allow, store, monthlyCalls: 1, now: () => now });
    expect(await g.takeBudget()).toBe(true);
    expect(await g.takeBudget()).toBe(false);
    now = new Date("2026-12-01T00:00:01Z");
    expect(await g.takeBudget()).toBe(true);
  });

  it("sets an expiry only when the counter is created", async () => {
    const store = memoryStore();
    const g = createGuards({ perMinute: allow, perDay: allow, store, monthlyCalls: 5 });
    await g.takeBudget();
    await g.takeBudget();
    expect(store.expires).toHaveLength(1);
  });

  it("fails closed when Redis errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store: CounterStore = {
      incr: async () => {
        throw new Error("redis down");
      },
      expire: async () => {},
    };
    expect(await createGuards({ perMinute: allow, perDay: allow, store, monthlyCalls: 5 }).takeBudget()).toBe(false);
  });
});

describe("guardsFromEnv", () => {
  it("returns null when Upstash is not configured", () => {
    expect(guardsFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
    expect(guardsFromEnv({ UPSTASH_REDIS_REST_URL: "https://x" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});
