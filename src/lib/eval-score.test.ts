import { describe, expect, it } from "vitest";
import { scoreRow, summarize, type EvalRow } from "./eval-score";

const row = (over: Partial<EvalRow>): EvalRow => ({
  file: "x.jpg",
  trueCount: 1,
  tolerance: 0,
  predicted: 1,
  ...over,
});

describe("scoreRow", () => {
  it("passes an exact match", () => {
    expect(scoreRow(row({ predicted: 1 }))).toMatchObject({ diff: 0, pass: true });
  });
  it("fails outside tolerance and passes inside it", () => {
    expect(scoreRow(row({ trueCount: 5, tolerance: 1, predicted: 7 })).pass).toBe(false);
    expect(scoreRow(row({ trueCount: 5, tolerance: 1, predicted: 4 })).pass).toBe(true);
  });
  it("treats a failed call as a fail with no diff", () => {
    expect(scoreRow(row({ predicted: null, error: "model_error" }))).toMatchObject({
      diff: null,
      pass: false,
    });
  });
});

describe("summarize", () => {
  it("computes pass rate, MAE, false positives and misses", () => {
    const rows = [
      row({ trueCount: 2, predicted: 2 }),
      row({ trueCount: 4, predicted: 2 }),
      row({ trueCount: 3, predicted: 0 }),
      row({ trueCount: 0, predicted: 0 }),
      row({ trueCount: 0, predicted: 1 }),
      row({ trueCount: 1, predicted: null }),
    ].map(scoreRow);
    const s = summarize(rows);
    expect(s.total).toBe(6);
    expect(s.failedCalls).toBe(1);
    expect(s.passed).toBe(2);
    expect(s.positives).toBe(3);
    expect(s.negatives).toBe(2);
    expect(s.falsePositives).toBe(1);
    expect(s.misses).toBe(1);
    expect(s.maeOnPositives).toBeCloseTo((0 + 2 + 3) / 3);
  });
  it("handles an empty set", () => {
    expect(summarize([])).toMatchObject({ total: 0, passRate: 0, maeOnPositives: null });
  });
});
