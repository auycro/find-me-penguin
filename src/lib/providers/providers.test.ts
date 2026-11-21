import { describe, expect, it } from "vitest";
import { getProvider, ProviderError } from "./index";
import { MockProvider } from "./mock";

const image = { mime: "image/jpeg" as const, bytes: new Uint8Array([1, 2, 3]) };

describe("MockProvider", () => {
  it("returns default points and records the call", async () => {
    const p = new MockProvider();
    const r = await p.countPenguins(image);
    expect(r.points).toHaveLength(3);
    expect(p.calls).toEqual([image]);
  });

  it("returns a configured result", async () => {
    const p = new MockProvider({ result: { points: [], note: "none" } });
    expect(await p.countPenguins(image)).toEqual({ points: [], note: "none" });
  });

  it("rejects with a configured ProviderError", async () => {
    const p = new MockProvider({ error: new ProviderError("model_error", "boom") });
    await expect(p.countPenguins(image)).rejects.toMatchObject({ code: "model_error" });
  });
});

describe("getProvider", () => {
  it("returns the mock provider by name", () => {
    expect(getProvider("mock").name).toBe("mock");
  });

  it("throws for unknown or unset providers", () => {
    expect(() => getProvider("nope")).toThrow(/Unknown provider/);
    expect(() => getProvider(undefined)).toThrow(/unset/);
  });
});
