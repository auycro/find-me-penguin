import { describe, expect, it } from "vitest";
import { clamp, coverTransform, dotCount, fitFontSize, frameHeight, isInside, mapPoint } from "./card-layout";

describe("frameHeight", () => {
  it("follows the photo shape within limits", () => {
    expect(frameHeight(1600, 1000, 940, 400, 700)).toBe(588);
    expect(frameHeight(1000, 3000, 940, 400, 700)).toBe(700); // tall photo capped
    expect(frameHeight(3000, 1000, 940, 400, 700)).toBe(400); // wide photo floored
  });
});

describe("coverTransform", () => {
  it("fills the frame with no gaps and centres the overflow", () => {
    const t = coverTransform(1600, 1000, 900, 900); // wide photo in a square frame: crops the sides
    expect(t.dh).toBeCloseTo(900);
    expect(t.dw).toBeCloseTo(1440);
    expect(t.dx).toBeCloseTo(-270);
    expect(t.dy).toBeCloseTo(0);
  });
  it("is an exact fit when the shapes match", () => {
    const t = coverTransform(1000, 500, 500, 250);
    expect(t).toMatchObject({ scale: 0.5, dx: 0, dy: 0, dw: 500, dh: 250 });
  });
});

describe("mapPoint", () => {
  it("maps the image centre to the frame centre", () => {
    const t = coverTransform(1600, 1000, 900, 900);
    const p = mapPoint({ x: 0.5, y: 0.5 }, 1600, 1000, t);
    expect(p.x).toBeCloseTo(450);
    expect(p.y).toBeCloseTo(450);
  });
  it("sends points in the cropped-off margin outside the frame", () => {
    const t = coverTransform(1600, 1000, 900, 900);
    const p = mapPoint({ x: 0.02, y: 0.5 }, 1600, 1000, t);
    expect(isInside(p, 900, 900)).toBe(false);
  });
  it("is the identity scaling for an uncropped frame", () => {
    const t = coverTransform(1000, 500, 500, 250);
    expect(mapPoint({ x: 0.25, y: 0.5 }, 1000, 500, t)).toEqual({ x: 125, y: 125 });
  });
});

describe("isInside", () => {
  it("honours the margin", () => {
    expect(isInside({ x: 5, y: 5 }, 100, 100, 10)).toBe(false);
    expect(isInside({ x: 50, y: 50 }, 100, 100, 10)).toBe(true);
  });
});

describe("dotCount / clamp / fitFontSize", () => {
  it("caps dots and ignores negatives", () => {
    expect(dotCount(3)).toBe(3);
    expect(dotCount(25)).toBe(10);
    expect(dotCount(-2)).toBe(0);
  });
  it("clamps", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
  it("shrinks text until it fits, but not below the minimum", () => {
    const measure = (s: number) => s * 3;
    expect(fitFontSize(measure, 600, 400)).toBeLessThanOrEqual(200);
    expect(fitFontSize(measure, 600, 400)).toBeGreaterThan(190);
    expect(fitFontSize(measure, 10, 400, 60)).toBe(60);
    expect(fitFontSize(measure, 5000, 100)).toBe(100);
  });
});
