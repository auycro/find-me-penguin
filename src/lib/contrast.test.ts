import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

/** Read `--name: #hex` declarations from one CSS block, e.g. ":root" or ".theme-snow". */
function vars(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2];
  return out;
}

const dark = vars(":root");
const snow = { ...dark, ...vars(".theme-snow") };

describe("contrast ratio maths", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});

describe.each([
  ["dark theme", dark],
  ["snow theme", snow],
])("%s", (_name, t) => {
  it("body text is AA (4.5:1) on the page and on cards", () => {
    expect(contrastRatio(t.fg, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.fg, t.surface)).toBeGreaterThanOrEqual(4.5);
  });
  it("muted text is AA on the page and on cards", () => {
    expect(contrastRatio(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
  });
  it("control borders are at least 3:1 against the page", () => {
    expect(contrastRatio(t["line-strong"], t.bg)).toBeGreaterThanOrEqual(3);
  });
});

describe("lime", () => {
  it("has AA text on it (buttons, chips, the zero tile)", () => {
    expect(contrastRatio(dark["on-lime"], dark.lime)).toBeGreaterThanOrEqual(4.5);
  });
  it("is readable as text on the dark page (counts, brand line)", () => {
    expect(contrastRatio(dark.lime, dark.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
