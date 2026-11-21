import { describe, expect, it } from "vitest";
import { createStats, type Stats } from "./stats";
import { handleStats } from "./stats-handler";

const fakeStats: Stats = {
  record: async () => {},
  summary: async (days) => ({
    days: [],
    totals: { ok: days, buckets: { zero: 0, one: 0, few: 0, some: 0, crowd: 0 }, errors: {} },
  }),
};

const req = (qs = "", headers: Record<string, string> = {}) =>
  new Request(`http://localhost/api/stats${qs}`, { headers });

describe("handleStats", () => {
  it("does not exist when no token is configured", async () => {
    const res = await handleStats(req("?token=anything"), { token: undefined, stats: fakeStats });
    expect(res.status).toBe(404);
  });

  it("rejects a missing or wrong token", async () => {
    const deps = { token: "s3cret-token", stats: fakeStats };
    expect((await handleStats(req(), deps)).status).toBe(401);
    expect((await handleStats(req("?token=nope"), deps)).status).toBe(401);
    expect((await handleStats(req("", { authorization: "Bearer nope" }), deps)).status).toBe(401);
  });

  it("accepts the token as a query parameter or a bearer header", async () => {
    const deps = { token: "s3cret-token", stats: fakeStats };
    expect((await handleStats(req("?token=s3cret-token&days=3"), deps)).status).toBe(200);
    expect((await handleStats(req("", { authorization: "Bearer s3cret-token" }), deps)).status).toBe(200);
  });

  it("passes the requested number of days and defaults to 7", async () => {
    const deps = { token: "t", stats: fakeStats };
    expect((await (await handleStats(req("?token=t&days=30"), deps)).json()).totals.ok).toBe(30);
    expect((await (await handleStats(req("?token=t"), deps)).json()).totals.ok).toBe(7);
    expect((await (await handleStats(req("?token=t&days=abc"), deps)).json()).totals.ok).toBe(7);
  });

  it("is never cached or indexed", async () => {
    const res = await handleStats(req("?token=t"), { token: "t", stats: fakeStats });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("reports 503 when Redis is not configured or fails", async () => {
    expect((await handleStats(req("?token=t"), { token: "t", stats: null })).status).toBe(503);
    const failing: Stats = { ...createStats({ hincrby: async () => 0, expire: async () => 0, hgetall: async () => null }), summary: async () => { throw new Error("down"); } };
    expect((await handleStats(req("?token=t"), { token: "t", stats: failing })).status).toBe(503);
  });
});
