"use client";

import { LangToggle } from "./LangToggle";
import { Mascot } from "./Mascot";
import { useLocale } from "./LocaleProvider";

export function Header() {
  const { m } = useLocale();
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-lime">
          <Mascot className="w-7" />
        </span>
        <span className="font-display text-lg leading-none tracking-tight">{m.brand}</span>
      </div>
      <LangToggle />
    </header>
  );
}
