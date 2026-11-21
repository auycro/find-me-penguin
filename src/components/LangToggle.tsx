"use client";

import { useLocale } from "./LocaleProvider";

export function LangToggle() {
  const { locale, setLocale, m } = useLocale();
  const seg = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${active ? "bg-lime text-on-lime" : "text-muted"}`;
  return (
    <div role="group" aria-label={m.language} className="flex items-center rounded-full border border-line p-0.5">
      <button type="button" className={seg(locale === "en")} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
        EN
      </button>
      <button type="button" className={seg(locale === "ja")} aria-pressed={locale === "ja"} onClick={() => setLocale("ja")} lang="ja">
        日本語
      </button>
    </div>
  );
}
