import { z } from "zod";

/** Upper bound on points we accept from a model, as a guard against runaway output. */
export const MAX_POINTS = 500;
export const MAX_NOTE_LENGTH = 200;

export type Point = { x: number; y: number };

export type CountResult = {
  /** Normalized (0-1) centre of each penguin-like figure. */
  points: Point[];
  /** Optional short remark, e.g. "image is blurry". */
  note?: string;
};

const coord = z.number().finite();

const rawOutputSchema = z.object({
  points: z.array(z.object({ x: coord, y: coord })).max(MAX_POINTS),
  note: z.string().optional(),
});

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Pull a JSON object out of model text, tolerating ``` fences and surrounding prose. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) return undefined;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
}

/**
 * Validate raw model output. Returns null when it is not usable
 * (no retry: callers surface a model_error).
 * Coordinates are clamped to [0, 1].
 */
export function parseModelOutput(text: string): CountResult | null {
  const json = extractJson(text);
  if (json === undefined) return null;
  const parsed = rawOutputSchema.safeParse(json);
  if (!parsed.success) return null;

  const result: CountResult = {
    points: parsed.data.points.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })),
  };
  const note = parsed.data.note?.trim();
  if (note) result.note = note.slice(0, MAX_NOTE_LENGTH);
  return result;
}
