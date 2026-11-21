"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CARD_H, CARD_W } from "@/lib/card-layout";
import type { Job } from "@/lib/flow";
import {
  CARD_STYLES,
  createCardCanvas,
  defaultStyle,
  drawCard,
  ensureCardFonts,
  type CardInput,
  type CardStyle,
} from "@/lib/share-card";
import { canShareFile, canvasToPngFile, downloadFile, shareFile } from "@/lib/share";
import { useLocale } from "./LocaleProvider";

type Props = {
  job: Job;
  /** "7" or "20+" */
  label: string;
  showMarks: boolean;
  /** Rendered next to Save, so the screen can keep its own "Again" button in the same row. */
  children?: ReactNode;
};

const THUMB_SCALE = 0.22;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = url;
  });
}

export function ShareCards({ job, label, showMarks, children }: Props) {
  const { m, locale } = useLocale();
  const headingId = useId();
  const result = job.result!;
  const [picked, setPicked] = useState<CardStyle | null>(null);
  const style = picked ?? defaultStyle(locale);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const canvases = useRef<Partial<Record<CardStyle, HTMLCanvasElement | null>>>({});

  useEffect(() => {
    let live = true;
    loadImage(job.previewUrl)
      .then((img) => live && setImage(img))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [job.previewUrl]);

  const input = (): CardInput | null =>
    image && {
      image,
      imageW: result.width,
      imageH: result.height,
      count: result.count,
      label,
      points: result.points,
      showMarks,
      locale,
      m,
    };

  // Thumbnails redraw when the photo, language or result changes.
  useEffect(() => {
    const data = input();
    if (!data) return;
    let live = true;
    ensureCardFonts(locale, m).then(() => {
      if (!live) return;
      for (const s of CARD_STYLES) {
        const canvas = canvases.current[s];
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawCard(ctx, s, data, THUMB_SCALE);
        }
      }
    });
    return () => {
      live = false;
    };
    // `input` is rebuilt from these values each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, locale, m, label, showMarks, result]);

  async function makeFile(): Promise<File> {
    const data = input();
    if (!data) throw new Error("Image not ready");
    await ensureCardFonts(locale, m);
    const canvas = createCardCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    drawCard(ctx, style, data);
    return canvasToPngFile(canvas, `find-me-penguin-${style}.png`);
  }

  async function run(action: "share" | "save") {
    setBusy(true);
    setFailed(false);
    try {
      const file = await makeFile();
      if (action === "share" && canShareFile(file)) await shareFile(file, m.brand);
      else downloadFile(file);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const names: Record<CardStyle, string> = { dark: m.styleDark, snow: m.styleSnow, zap: m.styleZap };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-xs font-bold uppercase tracking-wider text-muted">
        {m.cardsHeading}
      </h2>

      {/* Real radio inputs: arrow keys and screen-reader behaviour come for free. */}
      <fieldset aria-labelledby={headingId} className="grid grid-cols-3 gap-3">
        {CARD_STYLES.map((s) => (
          <label
            key={s}
            className="card-option flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-1.5 ring-1 ring-line-strong"
          >
            <input
              type="radio"
              name="card-style"
              value={s}
              checked={style === s}
              onChange={() => setPicked(s)}
              className="sr-only"
            />
            <canvas
              ref={(el) => {
                canvases.current[s] = el;
              }}
              width={Math.round(CARD_W * THUMB_SCALE)}
              height={Math.round(CARD_H * THUMB_SCALE)}
              className="w-full rounded-xl bg-surface"
              style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
              aria-hidden="true"
            />
            <span className="text-xs font-bold">{names[s]}</span>
          </label>
        ))}
      </fieldset>

      {failed && (
        <p role="alert" className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          {m.cardError}
        </p>
      )}

      <button type="button" className="btn btn-primary" disabled={busy || !image} onClick={() => run("share")}>
        <ShareIcon /> {m.share}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-ghost" disabled={busy || !image} onClick={() => run("save")}>
          <DownloadIcon /> {m.save}
        </button>
        {children}
      </div>
    </section>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5M5 14v5h14v-5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />
    </svg>
  );
}
