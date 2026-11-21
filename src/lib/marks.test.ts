import { describe, expect, it } from "vitest";
import { markHalfSize, xMarkSegments } from "./marks";

describe("xMarkSegments", () => {
  it("draws two crossing diagonals centred on the point", () => {
    const [a, b] = xMarkSegments({ x: 0.5, y: 0.5 }, 1000, 500);
    const h = markHalfSize(1000, 500);
    expect(a).toEqual({ x1: 500 - h, y1: 250 - h, x2: 500 + h, y2: 250 + h });
    expect(b).toEqual({ x1: 500 - h, y1: 250 + h, x2: 500 + h, y2: 250 - h });
  });
  it("scales with the image and has a minimum size", () => {
    expect(markHalfSize(2000, 1000)).toBeGreaterThan(markHalfSize(1000, 500));
    expect(markHalfSize(100, 100)).toBe(6);
  });
});
