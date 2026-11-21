import { createHash, timingSafeEqual } from "node:crypto";
import type { Stats } from "./stats";

export type StatsDeps = {
  /** STATS_TOKEN. When unset the endpoint does not exist (404). */
  token: string | undefined;
  stats: Stats | null;
};

const digest = (s: string) => createHash("sha256").update(s).digest();

function tokenMatches(supplied: string | null, expected: string): boolean {
  if (!supplied) return false;
  // Hash both sides so the comparison has equal length and takes constant time.
  return timingSafeEqual(digest(supplied), digest(expected));
}

function bearer(request: Request): string | null {
  const h = request.headers.get("authorization");
  return h?.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
}

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/**
 * GET /api/stats?token=...&days=7   (or `Authorization: Bearer ...`)
 * Anonymous daily totals only. Disabled unless STATS_TOKEN is set.
 */
export async function handleStats(request: Request, deps: StatsDeps): Promise<Response> {
  if (!deps.token) return new Response(null, { status: 404, headers: NO_STORE });

  const url = new URL(request.url);
  const supplied = url.searchParams.get("token") ?? bearer(request);
  if (!tokenMatches(supplied, deps.token)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  if (!deps.stats) {
    return Response.json({ error: "stats_unavailable" }, { status: 503, headers: NO_STORE });
  }

  const requested = Number(url.searchParams.get("days") ?? 7);
  const days = Number.isFinite(requested) ? requested : 7;
  try {
    return Response.json(await deps.stats.summary(days), { headers: NO_STORE });
  } catch {
    return Response.json({ error: "stats_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
