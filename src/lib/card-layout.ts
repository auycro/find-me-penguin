import type { Point } from "./schema";

export const CARD_W = 1080;
export const CARD_H = 1350;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Frame height that follows the photo's shape, within sensible limits for the card. */
export function frameHeight(imgW: number, imgH: number, frameW: number, min: number, max: number): number {
  return clamp(Math.round((frameW * imgH) / imgW), min, max);
}

export type CoverTransform = { scale: number; dx: number; dy: number; dw: number; dh: number };

/** Scale and centre an image so it fills a frame completely (the overflow is cropped). */
export function coverTransform(imgW: number, imgH: number, frameW: number, frameH: number): CoverTransform {
  const scale = Math.max(frameW / imgW, frameH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return { scale, dx: (frameW - dw) / 2, dy: (frameH - dh) / 2, dw, dh };
}

/** Where a normalized point lands inside the frame after the cover transform. */
export function mapPoint(p: Point, imgW: number, imgH: number, t: CoverTransform): Point {
  return { x: t.dx + p.x * imgW * t.scale, y: t.dy + p.y * imgH * t.scale };
}

export function isInside(p: Point, frameW: number, frameH: number, margin = 0): boolean {
  return p.x >= margin && p.y >= margin && p.x <= frameW - margin && p.y <= frameH - margin;
}

/** One dot per penguin on the card footer, capped so the row stays tidy. */
export function dotCount(count: number, cap = 10): number {
  return clamp(Math.floor(count), 0, cap);
}

/** Largest font size (down to `min`) at which the text still fits `maxWidth`. */
export function fitFontSize(measure: (size: number) => number, maxWidth: number, start: number, min = 40): number {
  let size = start;
  while (size > min && measure(size) > maxWidth) size -= 4;
  return Math.max(min, size);
}
