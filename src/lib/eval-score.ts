export type EvalItem = {
  file: string;
  trueCount: number;
  /** Allowed absolute error for a pass. 0 means exact. */
  tolerance: number;
  tags?: string[];
};

export type EvalRow = {
  file: string;
  trueCount: number;
  tolerance: number;
  /** null when the provider failed for this item. */
  predicted: number | null;
  error?: string;
};

export type ScoredRow = EvalRow & {
  diff: number | null;
  pass: boolean;
};

export type EvalSummary = {
  total: number;
  failedCalls: number;
  passed: number;
  passRate: number;
  /** Mean absolute error over images that contain penguins. */
  maeOnPositives: number | null;
  positives: number;
  negatives: number;
  /** Negatives where the model marked at least one penguin. */
  falsePositives: number;
  /** Positives where the model found none. */
  misses: number;
};

export function scoreRow(row: EvalRow): ScoredRow {
  if (row.predicted === null) return { ...row, diff: null, pass: false };
  const diff = row.predicted - row.trueCount;
  return { ...row, diff, pass: Math.abs(diff) <= row.tolerance };
}

export function summarize(rows: ScoredRow[]): EvalSummary {
  const answered = rows.filter((r) => r.predicted !== null);
  const positives = answered.filter((r) => r.trueCount > 0);
  const negatives = answered.filter((r) => r.trueCount === 0);
  const passed = rows.filter((r) => r.pass).length;
  const mae = positives.length
    ? positives.reduce((sum, r) => sum + Math.abs(r.diff ?? 0), 0) / positives.length
    : null;

  return {
    total: rows.length,
    failedCalls: rows.length - answered.length,
    passed,
    passRate: rows.length ? passed / rows.length : 0,
    maeOnPositives: mae,
    positives: positives.length,
    negatives: negatives.length,
    falsePositives: negatives.filter((r) => (r.predicted ?? 0) > 0).length,
    misses: positives.filter((r) => r.predicted === 0).length,
  };
}
