"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectLocale, isLocale, messages, type Locale, type Messages } from "@/lib/i18n";

const STORAGE_KEY = "fmp-locale";

type Ctx = { locale: Locale; m: Messages; setLocale: (l: Locale) => void };

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Always start in English so server and client markup match, then adopt the saved/detected locale.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    let next: Locale = detectLocale(navigator.languages);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved)) next = saved;
    } catch {
      // Storage can be blocked (private mode); the detected locale is fine.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Not persisting is acceptable.
    }
  }, []);

  const value = useMemo(() => ({ locale, m: messages[locale], setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
