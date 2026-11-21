"use client";

import Link from "next/link";
import { LangToggle } from "./LangToggle";
import { LocaleProvider, useLocale } from "./LocaleProvider";

function Content() {
  const { m } = useLocale();
  return (
    <div className="app">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-6 px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-2">
            ← {m.privacyBack}
          </Link>
          <LangToggle />
        </header>

        <div>
          <h1 className="font-display text-4xl leading-tight">{m.privacyTitle}</h1>
          <p className="mt-3 text-base text-muted">{m.privacyIntro}</p>
        </div>

        {m.privacySections.map((section) => (
          <section key={section.heading} className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg font-bold">{section.heading}</h2>
            <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-muted">
              {section.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LocaleProvider>
      <Content />
    </LocaleProvider>
  );
}
