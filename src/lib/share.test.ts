import { describe, expect, it, vi } from "vitest";
import { canShareFile, shareFile } from "./share";

const file = new File([new Uint8Array([1])], "card.png", { type: "image/png" });

describe("canShareFile", () => {
  it("is false when the Web Share API is missing", () => {
    expect(canShareFile(file, undefined)).toBe(false);
    expect(canShareFile(file, {})).toBe(false);
    expect(canShareFile(file, { share: async () => {} })).toBe(false);
  });
  it("follows canShare for files", () => {
    const share = async () => {};
    expect(canShareFile(file, { share, canShare: () => true })).toBe(true);
    expect(canShareFile(file, { share, canShare: () => false })).toBe(false);
  });
  it("treats a throwing canShare as false", () => {
    const canShare = () => {
      throw new Error("nope");
    };
    expect(canShareFile(file, { share: async () => {}, canShare })).toBe(false);
  });
});

describe("shareFile", () => {
  it("shares the file with a title", async () => {
    const share = vi.fn(async (data?: ShareData) => void data);
    expect(await shareFile(file, "Find Me Penguin", { share })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file], title: "Find Me Penguin" });
  });
  it("reports a dismissed sheet as cancelled, not an error", async () => {
    const share = async () => {
      throw new DOMException("closed", "AbortError");
    };
    expect(await shareFile(file, "t", { share })).toBe("cancelled");
  });
  it("rethrows real failures", async () => {
    const share = async () => {
      throw new DOMException("denied", "NotAllowedError");
    };
    await expect(shareFile(file, "t", { share })).rejects.toThrow("denied");
  });
  it("throws when sharing is unsupported", async () => {
    await expect(shareFile(file, "t", {})).rejects.toThrow(/not supported/);
  });
});
