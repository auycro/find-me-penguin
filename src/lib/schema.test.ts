import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH, MAX_POINTS, parseModelOutput } from "./schema";

describe("parseModelOutput", () => {
  it("parses plain JSON", () => {
    const r = parseModelOutput('{"points":[{"x":0.1,"y":0.2}]}');
    expect(r).toEqual({ points: [{ x: 0.1, y: 0.2 }] });
  });

  it("accepts an empty point list", () => {
    expect(parseModelOutput('{"points":[]}')).toEqual({ points: [] });
  });

  it("unwraps code fences", () => {
    const r = parseModelOutput('```json\n{"points":[{"x":0.5,"y":0.5}]}\n```');
    expect(r?.points).toHaveLength(1);
  });

  it("tolerates prose around the JSON", () => {
    const r = parseModelOutput('Here you go: {"points":[{"x":0,"y":1}]} Hope that helps!');
    expect(r?.points).toEqual([{ x: 0, y: 1 }]);
  });

  it("clamps coordinates to [0, 1]", () => {
    const r = parseModelOutput('{"points":[{"x":-0.2,"y":1.4}]}');
    expect(r?.points).toEqual([{ x: 0, y: 1 }]);
  });

  it("keeps a trimmed note and truncates long ones", () => {
    expect(parseModelOutput('{"points":[],"note":"  blurry  "}')?.note).toBe("blurry");
    const long = "a".repeat(MAX_NOTE_LENGTH + 50);
    expect(parseModelOutput(`{"points":[],"note":"${long}"}`)?.note).toHaveLength(MAX_NOTE_LENGTH);
  });

  it("drops an empty note", () => {
    expect(parseModelOutput('{"points":[],"note":"   "}')).toEqual({ points: [] });
  });

  it("returns null for non-JSON", () => {
    expect(parseModelOutput("I see three penguins")).toBeNull();
    expect(parseModelOutput("")).toBeNull();
  });

  it("returns null when the shape is wrong", () => {
    expect(parseModelOutput('{"count":3}')).toBeNull();
    expect(parseModelOutput('{"points":[{"x":"a","y":0}]}')).toBeNull();
    expect(parseModelOutput('{"points":[{"x":0.5}]}')).toBeNull();
  });

  it("returns null above the point cap", () => {
    const pts = Array.from({ length: MAX_POINTS + 1 }, () => ({ x: 0.5, y: 0.5 }));
    expect(parseModelOutput(JSON.stringify({ points: pts }))).toBeNull();
  });
});
