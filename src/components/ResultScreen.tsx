"use client";

import { useEffect, useState } from "react";
import { countView } from "@/lib/crowd";
import type { Job } from "@/lib/flow";
import { useLocale } from "./LocaleProvider";
import { MarkedPhoto } from "./MarkedPhoto";
import { ShareCards } from "./ShareCards";
import { Mascot } from "./Mascot";

type Props = { job: Job; onClose: () => void; onAgain: () => void };

/** Counts up from 0 so the number lands with a little drama. Instant for reduced motion. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target <= 1) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

export function ResultScreen({ job, onClose, onAgain }: Props) {
  const { m } = useLocale();
  const result = job.result!;
  const view = countView(result.count);
  const shown = useCountUp(view.kind === "count" ? view.value : 0);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="grid grid-cols-[3rem_1fr_3rem] items-center">
        <button type="button" onClick={onClose} aria-label={m.close} className="grid size-11 place-items-center text-2xl leading-none">
          ×
        </button>
        <p className="text-center text-sm font-bold text-muted">{m.resultTitle}</p>
      </header>

      {view.kind === "count" && (
        <>
          {/* The number animates, so sighted users see it counting up while screen readers get the final text. */}
          <h1 tabIndex={-1} className="flex items-end gap-3">
            <span className="sr-only">{m.foundSr(view.value)}</span>
            <span aria-hidden="true" className="font-display text-8xl leading-[0.8] text-lime">
              {shown}
            </span>
            <span aria-hidden="true" className="font-display pb-1 text-2xl leading-tight">
              {m.found(view.value)}
            </span>
          </h1>
          <MarkedPhoto
            src={job.previewUrl}
            width={result.width}
            height={result.height}
            points={result.points}
            showMarks
            alt={m.photoAltCount(view.value)}
          />
          <ShareCards job={job} label={String(view.value)} showMarks>
            <button type="button" className="btn btn-ghost" onClick={onAgain}>
              {m.again}
            </button>
          </ShareCards>
        </>
      )}

      {view.kind === "crowd" && (
        <>
          <div className="flex items-center gap-4">
            <span className="grid size-28 shrink-0 place-items-center rounded-full bg-lime">
              <Mascot variant="confused" className="w-24" />
            </span>
            <p aria-hidden="true" className="font-display text-7xl leading-[0.85] text-lime">
              {view.label}
            </p>
          </div>
          <div>
            <h1 tabIndex={-1} className="font-display text-2xl leading-tight">
              <span className="sr-only">{view.label} </span>
              {m.crowdHeadline}
            </h1>
            <p className="mt-2 text-sm text-muted">{m.crowdSub}</p>
          </div>
          <MarkedPhoto
            src={job.previewUrl}
            width={result.width}
            height={result.height}
            points={[]}
            showMarks={false}
            alt={m.photoAltCrowd}
          />
          <ShareCards job={job} label={view.label} showMarks={false}>
            <button type="button" className="btn btn-ghost" onClick={onAgain}>
              {m.again}
            </button>
          </ShareCards>
        </>
      )}

      {view.kind === "zero" && (
        <>
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="font-display grid size-24 shrink-0 place-items-center rounded-2xl border-2 border-fg bg-lime text-6xl text-on-lime"
            >
              0
            </span>
            <div>
              <h1 tabIndex={-1} className="font-display text-2xl leading-tight">
                {m.zeroHeadline}
              </h1>
              <p className="mt-1 text-sm text-muted">{m.zeroSub}</p>
            </div>
          </div>
          <MarkedPhoto
            src={job.previewUrl}
            width={result.width}
            height={result.height}
            points={[]}
            showMarks={false}
            alt={m.photoAltZero}
          />
          <section className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{m.tryThis}</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm">
              {[m.tip1, m.tip2, m.tip3].map((tip) => (
                <li key={tip} className="flex gap-3">
                  <span className="mt-1 size-3 shrink-0 rounded-[3px] border-2 border-fg bg-lime" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {view.kind === "zero" && (
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <button type="button" className="btn btn-primary" onClick={onAgain}>
            {m.tryAnother}
          </button>
        </div>
      )}
    </div>
  );
}
