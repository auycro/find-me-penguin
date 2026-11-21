import {
  CARD_H,
  CARD_W,
  coverTransform,
  dotCount,
  fitFontSize,
  frameHeight,
  isInside,
  mapPoint,
} from "./card-layout";
import type { Locale, Messages } from "./i18n";
import { markHalfSize } from "./marks";
import type { Point } from "./schema";

export type CardStyle = "tux" | "snow" | "zap";
export const CARD_STYLES: readonly CardStyle[] = ["tux", "snow", "zap"];

export type CardInput = {
  image: CanvasImageSource;
  imageW: number;
  imageH: number;
  count: number;
  /** "7" for exact counts, "20+" for crowds. */
  label: string;
  points: Point[];
  showMarks: boolean;
  locale: Locale;
  m: Messages;
};

const LIME = "#d4ff4f";
const INK = "#0a0a0c";
const WHITE = "#ffffff";
const MARGIN = 70;
const INNER_W = CARD_W - MARGIN * 2;

const latinFont = (size: number) => `400 ${size}px "Archivo Black", "Noto Sans JP", system-ui, sans-serif`;
const jpFont = (size: number) => `900 ${size}px "Noto Sans JP", "Archivo Black", system-ui, sans-serif`;
const displayFont = (locale: Locale) => (locale === "ja" ? jpFont : latinFont);

export const defaultStyle = (locale: Locale): CardStyle => (locale === "ja" ? "snow" : "tux");

/** Make sure the web fonts are ready before drawing, including the exact Japanese glyphs. */
export async function ensureCardFonts(locale: Locale, m: Messages): Promise<void> {
  const jpText = `${m.brandJa}${m.cardUnit(2)}${m.cardFound}${m.cardSnowTitle}${m.cardSnowFound}${m.cardSnowSuffix}${m.cardZap1}${m.cardZap2}0123456789+`;
  await Promise.all([
    document.fonts.load(latinFont(40), "Find Me Penguin0123456789+Penguins.Counted.penguinsfound!"),
    document.fonts.load(jpFont(40), jpText),
  ]);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawX(ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number) {
  ctx.lineCap = "round";
  const stroke = (color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy - half);
    ctx.lineTo(cx + half, cy + half);
    ctx.moveTo(cx - half, cy + half);
    ctx.lineTo(cx + half, cy - half);
    ctx.stroke();
  };
  stroke(INK, half * 1.05 * 2.1);
  stroke(LIME, half * 1.05);
}

/** Photo in a bordered, rounded frame, cropped to fill, with the X marks mapped into it. */
function drawPhotoFrame(
  ctx: CanvasRenderingContext2D,
  input: CardInput,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  border: number,
  borderColor: string,
) {
  ctx.fillStyle = borderColor;
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fill();

  const ix = x + border;
  const iy = y + border;
  const iw = w - border * 2;
  const ih = h - border * 2;

  ctx.save();
  roundedRect(ctx, ix, iy, iw, ih, Math.max(0, radius - border));
  ctx.clip();
  const t = coverTransform(input.imageW, input.imageH, iw, ih);
  ctx.drawImage(input.image, ix + t.dx, iy + t.dy, t.dw, t.dh);

  if (input.showMarks) {
    // Cards are viewed small, so marks are drawn larger than on the result screen.
    const half = markHalfSize(iw, ih) * 1.5;
    for (const p of input.points) {
      const at = mapPoint(p, input.imageW, input.imageH, t);
      if (isInside(at, iw, ih, half)) drawX(ctx, ix + at.x, iy + at.y, half);
    }
  }
  ctx.restore();
}

function drawDots(ctx: CanvasRenderingContext2D, count: number, rightX: number, y: number, color: string) {
  const n = dotCount(count);
  const r = 14;
  const gap = 44;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(rightX - r - (n - 1 - i) * gap, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "left",
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(str, x, y);
}

function fitted(ctx: CanvasRenderingContext2D, str: string, fontOf: (s: number) => string, maxW: number, start: number) {
  return fitFontSize(
    (s) => {
      ctx.font = fontOf(s);
      return ctx.measureText(str).width;
    },
    maxW,
    start,
  );
}

function drawTux(ctx: CanvasRenderingContext2D, input: CardInput) {
  const { m, locale, label, count } = input;
  const font = displayFont(locale);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const h = frameHeight(input.imageW, input.imageH, INNER_W, 440, 700);
  drawPhotoFrame(ctx, input, MARGIN, MARGIN, INNER_W, h, 56, 12, WHITE);

  // Centre the number block in the space between the photo and the footer.
  const frameBottom = MARGIN + h;
  const numSize = fitted(ctx, label, font, 470, 330);
  const blockH = numSize * 0.78;
  const baseline = frameBottom + (1190 - frameBottom + blockH) / 2;
  text(ctx, label, MARGIN, baseline, font(numSize), LIME);
  ctx.font = font(numSize);
  const numW = ctx.measureText(label).width;

  const side = MARGIN + numW + 36;
  const line1 = m.cardUnit(count);
  const sideSize = fitted(ctx, line1, font, CARD_W - MARGIN - side, 88);
  text(ctx, line1, side, baseline - sideSize * 1.05, font(sideSize), WHITE);
  text(ctx, m.cardFound, side, baseline, font(sideSize), WHITE);

  text(ctx, "Find Me Penguin", MARGIN, 1270, latinFont(44), WHITE);
  drawDots(ctx, count, CARD_W - MARGIN, 1256, LIME);
}

function drawSnow(ctx: CanvasRenderingContext2D, input: CardInput) {
  const { m, locale, label } = input;
  const font = displayFont(locale);
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // brand pill
  const pillText = locale === "ja" ? m.brandJa : "Find Me Penguin";
  ctx.font = font(34);
  const pillW = ctx.measureText(pillText).width + 64;
  ctx.fillStyle = LIME;
  roundedRect(ctx, MARGIN, MARGIN, pillW, 68, 34);
  ctx.fill();
  text(ctx, pillText, MARGIN + 32, MARGIN + 46, font(34), INK);

  const line1 = fitted(ctx, m.cardSnowTitle, font, INNER_W, 150);
  text(ctx, m.cardSnowTitle, MARGIN, 330, font(line1), INK);

  const numberLine = `${label}${m.cardSnowSuffix}`;
  const line2 = fitted(ctx, numberLine, font, INNER_W, 250);
  text(ctx, numberLine, MARGIN, 330 + line2 * 0.98, font(line2), INK);

  const line3 = fitted(ctx, m.cardSnowFound, font, INNER_W, 120);
  const y3 = 330 + line2 * 0.98 + line3 * 1.1;
  text(ctx, m.cardSnowFound, MARGIN, y3, font(line3), INK);

  const bottom = CARD_H - MARGIN;
  const room = bottom - (y3 + 50);
  const h = Math.min(frameHeight(input.imageW, input.imageH, INNER_W, 340, 560), Math.max(300, room));
  drawPhotoFrame(ctx, input, MARGIN, bottom - h, INNER_W, h, 52, 10, INK);
}

function drawZap(ctx: CanvasRenderingContext2D, input: CardInput) {
  const { m, locale, label, count } = input;
  const font = displayFont(locale);
  ctx.fillStyle = LIME;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  text(ctx, "Find Me Penguin", MARGIN, 120, latinFont(40), INK);
  drawDots(ctx, count, CARD_W - MARGIN, 108, INK);

  const numSize = fitted(ctx, label, font, INNER_W, 470);
  const numBase = 170 + numSize * 0.8;
  text(ctx, label, MARGIN, numBase, font(numSize), INK);

  const t1 = fitted(ctx, m.cardZap1, font, INNER_W, 92);
  text(ctx, m.cardZap1, MARGIN, numBase + t1 * 1.25, font(t1), INK);
  const t2 = fitted(ctx, m.cardZap2, font, INNER_W, 92);
  text(ctx, m.cardZap2, MARGIN, numBase + t1 * 1.25 + t2 * 1.12, font(t2), INK);

  const textBottom = numBase + t1 * 1.25 + t2 * 1.12;
  const bottom = CARD_H - MARGIN;
  const room = bottom - (textBottom + 50);
  const h = Math.min(frameHeight(input.imageW, input.imageH, INNER_W, 300, 480), Math.max(280, room));
  drawPhotoFrame(ctx, input, MARGIN, bottom - h, INNER_W, h, 56, 14, INK);
}

/** Draw a card at CARD_W x CARD_H, optionally scaled down for thumbnails. */
export function drawCard(ctx: CanvasRenderingContext2D, style: CardStyle, input: CardInput, scale = 1) {
  ctx.save();
  ctx.scale(scale, scale);
  if (style === "tux") drawTux(ctx, input);
  else if (style === "snow") drawSnow(ctx, input);
  else drawZap(ctx, input);
  ctx.restore();
}

export function createCardCanvas(scale = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CARD_W * scale);
  canvas.height = Math.round(CARD_H * scale);
  return canvas;
}
