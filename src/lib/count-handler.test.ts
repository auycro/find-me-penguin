import { describe, expect, it, vi } from "vitest";
import { handleCount } from "./count-handler";
import { MAX_IMAGE_BYTES, sniffMime } from "./image";
import { MockProvider } from "./providers/mock";
import type { Guards } from "./limits";
import { ProviderError } from "./providers/types";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

function req(file?: Uint8Array | null, name = "photo.jpg"): Request {
  const form = new FormData();
  if (file) form.set("image", new File([file as BlobPart], name));
  return new Request("http://localhost/api/count", { method: "POST", body: form });
}

describe("sniffMime", () => {
  it("detects jpeg, png and webp", () => {
    expect(sniffMime(JPEG)).toBe("image/jpeg");
    expect(sniffMime(PNG)).toBe("image/png");
    expect(sniffMime(WEBP)).toBe("image/webp");
  });
  it("rejects anything else", () => {
    expect(sniffMime(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(sniffMime(new Uint8Array())).toBeNull();
  });
});

describe("handleCount", () => {
  it("returns count equal to number of points", async () => {
    const provider = new MockProvider();
    const res = await handleCount(req(JPEG), { guards: null, getProvider: () => provider });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(3);
    expect(body.points).toHaveLength(3);
    expect(provider.calls[0].mime).toBe("image/jpeg");
  });

  it("returns count 0 and the note for an empty result", async () => {
    const provider = new MockProvider({ result: { points: [], note: "too dark" } });
    const body = await (await handleCount(req(JPEG), { guards: null, getProvider: () => provider })).json();
    expect(body).toEqual({ count: 0, points: [], note: "too dark" });
  });

  it("ignores the declared file type and uses magic bytes", async () => {
    const provider = new MockProvider();
    await handleCount(req(PNG, "x.jpg"), { guards: null, getProvider: () => provider });
    expect(provider.calls[0].mime).toBe("image/png");
  });

  it("rejects a missing image", async () => {
    const provider = new MockProvider();
    const res = await handleCount(req(null), { guards: null, getProvider: () => provider });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bad_image" });
    expect(provider.calls).toHaveLength(0);
  });

  it("rejects non-multipart bodies", async () => {
    const res = await handleCount(
      new Request("http://localhost/api/count", { method: "POST", body: "hello" }),
      { guards: null, getProvider: () => new MockProvider() },
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-image bytes", async () => {
    const provider = new MockProvider();
    const res = await handleCount(req(new Uint8Array([1, 2, 3, 4, 5])), { guards: null, getProvider: () => provider });
    expect(res.status).toBe(400);
    expect(provider.calls).toHaveLength(0);
  });

  it("rejects oversized images with 413", async () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(JPEG);
    const provider = new MockProvider();
    const res = await handleCount(req(big), { guards: null, getProvider: () => provider });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "bad_image" });
    expect(provider.calls).toHaveLength(0);
  });

  it("maps provider errors to model_error 502 and timeouts to 504", async () => {
    const e1 = new MockProvider({ error: new ProviderError("model_error", "x") });
    const r1 = await handleCount(req(JPEG), { guards: null, getProvider: () => e1 });
    expect(r1.status).toBe(502);
    expect(await r1.json()).toEqual({ error: "model_error" });

    const e2 = new MockProvider({ error: new ProviderError("timeout", "x") });
    expect((await handleCount(req(JPEG), { guards: null, getProvider: () => e2 })).status).toBe(504);
  });

  it("maps unexpected errors to model_error without leaking details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = {
      name: "boom",
      countPenguins: async () => {
        throw new Error("secret detail");
      },
    };
    const res = await handleCount(req(JPEG), { guards: null, getProvider: () => provider });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });

  it("returns 500 model_error when the provider is misconfigured", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleCount(req(JPEG), {
      guards: null,
      getProvider: () => {
        throw new Error("Unknown provider");
      },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "model_error" });
  });

  describe("guards", () => {
    const guards = (over: Partial<Guards> = {}): Guards => ({
      allowRequest: async () => true,
      takeBudget: async () => true,
      ...over,
    });

    it("returns 429 rate_limited with Retry-After and never reaches the model", async () => {
      const provider = new MockProvider();
      const takeBudget = vi.fn(async () => true);
      const res = await handleCount(req(JPEG), {
        guards: guards({ allowRequest: async () => false, takeBudget }),
        getProvider: () => provider,
      });
      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("60");
      expect(await res.json()).toEqual({ error: "rate_limited" });
      expect(takeBudget).not.toHaveBeenCalled();
      expect(provider.calls).toHaveLength(0);
    });

    it("returns 503 budget_exceeded and never reaches the model", async () => {
      const provider = new MockProvider();
      const res = await handleCount(req(JPEG), {
        guards: guards({ takeBudget: async () => false }),
        getProvider: () => provider,
      });
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "budget_exceeded" });
      expect(provider.calls).toHaveLength(0);
    });

    it("does not spend budget on invalid uploads", async () => {
      const takeBudget = vi.fn(async () => true);
      const res = await handleCount(req(new Uint8Array([1, 2, 3])), {
        guards: guards({ takeBudget }),
        getProvider: () => new MockProvider(),
      });
      expect(res.status).toBe(400);
      expect(takeBudget).not.toHaveBeenCalled();
    });

    it("passes the caller IP from proxy headers to the rate limiter", async () => {
      const allowRequest = vi.fn(async () => true);
      const form = new FormData();
      form.set("image", new File([JPEG as BlobPart], "a.jpg"));
      await handleCount(
        new Request("http://localhost/api/count", {
          method: "POST",
          body: form,
          headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
        }),
        { guards: guards({ allowRequest }), getProvider: () => new MockProvider() },
      );
      expect(allowRequest).toHaveBeenCalledWith("203.0.113.7");
    });
  });
});
