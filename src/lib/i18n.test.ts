import { describe, expect, it } from "vitest";
import { detectLocale, errorMessage, isLocale, messages, type ErrorKey } from "./i18n";

describe("messages", () => {
  it("has the same keys in every locale", () => {
    expect(Object.keys(messages.ja).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it("has no empty strings, except where a language needs no text", () => {
    // English has no counter word after the number on the Snow card; Japanese does (羽).
    const mayBeEmpty = new Set(["cardSnowSuffix"]);
    for (const locale of ["en", "ja"] as const) {
      for (const [key, value] of Object.entries(messages[locale])) {
        if (typeof value === "string" && !mayBeEmpty.has(key)) expect(value.trim(), `${locale}.${key}`).not.toBe("");
      }
    }
    expect(messages.ja.cardSnowSuffix).not.toBe("");
  });

  it("has the same privacy sections in both languages, all with text", () => {
    expect(messages.ja.privacySections).toHaveLength(messages.en.privacySections.length);
    for (const locale of ["en", "ja"] as const) {
      for (const section of messages[locale].privacySections) {
        expect(section.heading.trim()).not.toBe("");
        expect(section.body.length).toBeGreaterThan(0);
        for (const p of section.body) expect(p.trim().length).toBeGreaterThan(20);
      }
    }
    expect(messages.ja.privacySections.map((s) => s.body.length)).toEqual(
      messages.en.privacySections.map((s) => s.body.length),
    );
  });

  it("pluralizes the English found label", () => {
    expect(messages.en.found(1)).toBe("penguin found!");
    expect(messages.en.found(7)).toBe("penguins found!");
    expect(messages.ja.found(7)).toContain("羽");
  });

  it("has a message for every error key in both languages", () => {
    const keys: ErrorKey[] = [
      "unsupported",
      "empty",
      "too_large",
      "bad_image",
      "rate_limited",
      "budget_exceeded",
      "model_error",
      "network",
    ];
    for (const k of keys) {
      expect(errorMessage(messages.en, k).length).toBeGreaterThan(5);
      expect(errorMessage(messages.ja, k).length).toBeGreaterThan(5);
    }
  });
});

describe("detectLocale", () => {
  it("picks Japanese when it is the first language", () => {
    expect(detectLocale(["ja-JP", "en"])).toBe("ja");
    expect(detectLocale(["ja"])).toBe("ja");
  });
  it("defaults to English", () => {
    expect(detectLocale(["en-US", "ja"])).toBe("en");
    expect(detectLocale(["th-TH"])).toBe("en");
    expect(detectLocale([])).toBe("en");
    expect(detectLocale(undefined)).toBe("en");
  });
  it("validates stored locale values", () => {
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
