import { describe, expect, it } from "vitest";
import { countView, CROWD_THRESHOLD } from "./crowd";

describe("countView", () => {
  it("maps zero and negatives to zero", () => {
    expect(countView(0)).toEqual({ kind: "zero" });
    expect(countView(-1)).toEqual({ kind: "zero" });
  });
  it("shows exact counts up to and including the threshold", () => {
    expect(countView(1)).toEqual({ kind: "count", value: 1 });
    expect(countView(CROWD_THRESHOLD)).toEqual({ kind: "count", value: CROWD_THRESHOLD });
  });
  it("shows 20+ above the threshold", () => {
    expect(countView(CROWD_THRESHOLD + 1)).toEqual({ kind: "crowd", label: "20+" });
    expect(countView(500)).toEqual({ kind: "crowd", label: "20+" });
  });
});
