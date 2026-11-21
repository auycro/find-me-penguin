import type { Point } from "./schema";

export type Segment = { x1: number; y1: number; x2: number; y2: number };

/** Half-size of an X mark in pixels, scaled to the image so it reads at any size. */
export function markHalfSize(width: number, height: number): number {
  return Math.max(6, Math.max(width, height) * 0.017);
}

/** The two strokes of an X centred on a normalized point, in image pixels. */
export function xMarkSegments(point: Point, width: number, height: number): [Segment, Segment] {
  const cx = point.x * width;
  const cy = point.y * height;
  const h = markHalfSize(width, height);
  return [
    { x1: cx - h, y1: cy - h, x2: cx + h, y2: cy + h },
    { x1: cx - h, y1: cy + h, x2: cx + h, y2: cy - h },
  ];
}
