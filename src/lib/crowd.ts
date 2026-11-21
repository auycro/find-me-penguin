/** Above this many penguins we stop pretending to be exact. */
export const CROWD_THRESHOLD = 20;

export type CountView =
  | { kind: "zero" }
  | { kind: "count"; value: number }
  | { kind: "crowd"; label: string };

export function countView(count: number): CountView {
  if (count <= 0) return { kind: "zero" };
  if (count > CROWD_THRESHOLD) return { kind: "crowd", label: `${CROWD_THRESHOLD}+` };
  return { kind: "count", value: count };
}
