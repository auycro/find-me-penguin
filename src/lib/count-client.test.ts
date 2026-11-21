import { describe, expect, it, vi } from "vitest";
import { CountClientError, requestCount } from "./count-client";

const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

describe("requestCount", () => {
  it("posts the image as multipart and returns the parsed result", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      void _url;
      void init;
      return json({ count: 2, points: [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.5 }] });
    });
    const out = await requestCount(blob, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(out.count).toBe(2);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/count");
    expect(init?.method).toBe("POST");
    expect((init?.body as FormData).get("image")).toBeInstanceOf(File);
  });

  it.each([
    [429, "rate_limited", "rate_limited"],
    [503, "budget_exceeded", "budget_exceeded"],
    [400, "bad_image", "bad_image"],
    [502, "model_error", "model_error"],
  ])("maps HTTP %i with body error %s", async (status, error, expected) => {
    const fetchImpl = (async () => json({ error }, status)) as unknown as typeof fetch;
    await expect(requestCount(blob, { fetchImpl })).rejects.toMatchObject({ code: expected });
  });

  it("falls back to the status code when the body is unusable", async () => {
    const html = (async () => new Response("<html>", { status: 429 })) as unknown as typeof fetch;
    await expect(requestCount(blob, { fetchImpl: html })).rejects.toMatchObject({ code: "rate_limited" });
    const odd = (async () => json({ error: "weird" }, 500)) as unknown as typeof fetch;
    await expect(requestCount(blob, { fetchImpl: odd })).rejects.toMatchObject({ code: "model_error" });
  });

  it("treats a malformed success body as model_error", async () => {
    const fetchImpl = (async () => json({ count: "many" })) as unknown as typeof fetch;
    await expect(requestCount(blob, { fetchImpl })).rejects.toMatchObject({ code: "model_error" });
  });

  it("reports network failures", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const err = await requestCount(blob, { fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(CountClientError);
    expect(err.code).toBe("network");
  });

  it("lets aborts through unchanged", async () => {
    const fetchImpl = (async () => {
      throw new DOMException("aborted", "AbortError");
    }) as unknown as typeof fetch;
    const err = await requestCount(blob, { fetchImpl }).catch((e) => e);
    expect(err.name).toBe("AbortError");
  });
});
