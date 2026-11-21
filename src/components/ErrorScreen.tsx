"use client";

import { errorMessage, type ErrorKey } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";
import { Mascot } from "./Mascot";

type Props = { error: ErrorKey; onAgain: () => void };

export function ErrorScreen({ error, onAgain }: Props) {
  const { m } = useLocale();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <span className="grid size-44 place-items-center rounded-full bg-lime">
        <Mascot variant="confused" className="w-36" />
      </span>
      <div role="alert">
        <h1 tabIndex={-1} className="font-display text-2xl">
          {m.errTitle}
        </h1>
        <p className="mt-3 text-base text-muted">{errorMessage(m, error)}</p>
      </div>
      <button type="button" className="btn btn-primary mt-2" onClick={onAgain}>
        {m.tryAnother}
      </button>
    </div>
  );
}
