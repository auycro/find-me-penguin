import { describe, expect, it, vi } from "vitest";
import { bucketOf, createStats, dateString, type StatsStore } from "./stats";

function memory(): StatsStore & { hashes: Map<string, Record<string, number>>; expiries: string[] } {
  const hashes = new Map<string, Record<string, number>>();
  const expiries: string[] = [];
  return {
    hashes,
    expiries,
    async hincrby(key, field, by) {
      const h = hashes.get(key) ?? {};
      h[field] = (h[field] ?? 0) + by;
      hashes.set(key, h);
      return h[field];
    },
    async expire(key) {
      expiries.push(key);
    },
    async hgetall(key) {
      return hashes.get(key) ?? null;
    },
  };
}

describe("bucketOf", () => {
  it("groups counts: none, 1, 2-5, 6-20, more than 20", () => {
    expect([0, 1, 2, 5, 6, 20, 21, 500].map(bucketOf)).toEqual(["zero", "one", "few", "few", "some", "some", "crowd", "crowd"]);
  });
});

describe("record", () => {
  const day = new Date("2026-11-21T10:00:00Z");

  it("counts successes with their size group", async () => {
    const store = memory();
    const stats = createStats(store, () => day);
    await stats.record({ type: "ok", count: 3 });
    await stats.record({ type: "ok", count: 30 });
    expect(store.hashes.get("stats:2026-11-21")).toEqual({ ok: 2, "bucket:few": 1, "bucket:crowd": 1 });
    expect(store.expiries).toContain("stats:2026-11-21");
  });

  it("counts server-side errors by code", async () => {
    const store = memory();
    const stats = createStats(store, () => day);
    await stats.record({ type: "error", code: "model_error" });
    await stats.record({ type: "error", code: "model_error" });
    await stats.record({ type: "error", code: "budget_exceeded" });
    expect(store.hashes.get("stats:2026-11-21")).toEqual({ "err:model_error": 2, "err:budget_exceeded": 1 });
  });

  it("uses the UTC date, so a new day starts a new hash", async () => {
    const store = memory();
    let now = new Date("2026-11-21T23:59:59Z");
    const stats = createStats(store, () => now);
    await stats.record({ type: "ok", count: 1 });
    now = new Date("2026-11-22T00:00:01Z");
    await stats.record({ type: "ok", count: 1 });
    expect([...store.hashes.keys()].sort()).toEqual(["stats:2026-11-21", "stats:2026-11-22"]);
  });

  it("never throws when the store fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: StatsStore = {
      hincrby: async () => {
        throw new Error("redis down");
      },
      expire: async () => {},
      hgetall: async () => null,
    };
    await expect(createStats(broken).record({ type: "ok", count: 1 })).resolves.toBeUndefined();
  });

  it("stores nothing that identifies a person", async () => {
    const store = memory();
    await createStats(store, () => day).record({ type: "ok", count: 2 });
    const text = JSON.stringify([...store.hashes.entries()]);
    expect(text).not.toMatch(/ip|user|photo|image/i);
  });
});

describe("summary", () => {
  it("fills missing days with zeros, newest first, and adds totals", async () => {
    const store = memory();
    let now = new Date("2026-11-20T12:00:00Z");
    const stats = createStats(store, () => now);
    await stats.record({ type: "ok", count: 0 });
    await stats.record({ type: "ok", count: 7 });
    await stats.record({ type: "error", code: "model_error" });
    now = new Date("2026-11-22T12:00:00Z");
    await stats.record({ type: "ok", count: 2 });

    const s = await stats.summary(3);
    expect(s.days.map((d) => d.date)).toEqual(["2026-11-22", "2026-11-21", "2026-11-20"]);
    expect(s.days[1]).toMatchObject({ ok: 0, errors: {} });
    expect(s.days[2]).toMatchObject({ ok: 2, buckets: { zero: 1, some: 1 }, errors: { model_error: 1 } });
    expect(s.totals.ok).toBe(3);
    expect(s.totals.buckets).toEqual({ zero: 1, one: 0, few: 1, some: 1, crowd: 0 });
    expect(s.totals.errors).toEqual({ model_error: 1 });
  });

  it("clamps the number of days to 1..90", async () => {
    const stats = createStats(memory());
    expect((await stats.summary(0)).days).toHaveLength(1);
    expect((await stats.summary(1000)).days).toHaveLength(90);
  });

  it("ignores junk fields in Redis", async () => {
    const store = memory();
    store.hashes.set(`stats:${dateString(new Date())}`, { ok: 2, "bucket:weird": 5, "err:x": 1, junk: 9 });
    const s = await createStats(store).summary(1);
    expect(s.days[0].ok).toBe(2);
    expect(s.days[0].errors).toEqual({ x: 1 });
    expect(s.totals.buckets).toEqual({ zero: 0, one: 0, few: 0, some: 0, crowd: 0 });
  });
});
