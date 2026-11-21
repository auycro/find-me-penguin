"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
import { Mascot } from "./Mascot";

type Props = {
  previewUrl: string;
  onCancel: () => void;
  onBackground: () => void;
};

export function CountingScreen({ previewUrl, onCancel, onBackground }: Props) {
  const { m } = useLocale();
  const lines = [m.progress1, m.progress2, m.progress3, m.progress4];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 tabIndex={-1} className="font-display text-2xl">
          {m.counting}
        </h1>
        <button type="button" onClick={onCancel} className="min-h-11 min-w-11 px-3 text-sm font-bold text-muted">
          {m.cancel}
        </button>
      </header>

      <div className="relative overflow-hidden rounded-3xl bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={m.photoAltCounting} className="block max-h-[46dvh] w-full object-cover opacity-80" />
        <div className="scan-line" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        <span className="grid size-40 place-items-center rounded-full bg-lime">
          <Mascot variant="searching" className="w-32" />
        </span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-label={m.counting} aria-busy="true">
          <div className="progress-fill" />
        </div>
        {/* Rotates every 1.4s: decorative, so it is hidden from screen readers (the heading announces the state). */}
        <p aria-hidden="true" className="min-h-10 text-center text-sm text-muted">
          {lines[i % lines.length]}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <p className="text-center text-xs text-muted">{m.countingHint}</p>
        <button type="button" className="btn btn-ghost" onClick={onBackground}>
          {m.countInBackground}
        </button>
      </div>
    </div>
  );
}
