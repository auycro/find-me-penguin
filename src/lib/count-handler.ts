import { MAX_IMAGE_BYTES, sniffMime } from "./image";
import { clientIp, type Guards } from "./limits";
import type { StatEvent, Stats } from "./stats";
import { ProviderError, type PenguinProvider } from "./providers/types";
import type { Point } from "./schema";

export type CountErrorCode =
  | "rate_limited"
  | "budget_exceeded"
  | "bad_image"
  | "model_error";

export type CountSuccess = { count: number; points: Point[]; note?: string };
export type CountFailure = { error: CountErrorCode };

const STATUS: Record<CountErrorCode, number> = {
  rate_limited: 429,
  budget_exceeded: 503,
  bad_image: 400,
  model_error: 502,
};

function fail(code: CountErrorCode, status: number = STATUS[code]): Response {
  return Response.json({ error: code } satisfies CountFailure, { status });
}

export type CountDeps = {
  /** Rate limit and monthly budget. Null disables both (local development only). */
  guards: Guards | null;
  /** Anonymous aggregate counters. Optional; failures never affect the response. */
  stats?: Stats | null;
  /** Resolved lazily so a misconfigured provider becomes a clean model_error. */
  getProvider: () => PenguinProvider;
};

/**
 * POST handler body for /api/count.
 * Expects multipart/form-data with an `image` file. Nothing is stored or logged.
 * Order: per-IP rate limit, then validation, then the monthly budget, then the model call.
 * Budget is spent only after validation so bad uploads cost nothing.
 */
export async function handleCount(request: Request, deps: CountDeps): Promise<Response> {
  // Only server-side outcomes are counted. Rate-limited and bad uploads are not, so abusers
  // cannot use them to burn the Redis quota.
  const done = async (res: Response, event: StatEvent): Promise<Response> => {
    await deps.stats?.record(event);
    return res;
  };

  if (deps.guards && !(await deps.guards.allowRequest(clientIp(request.headers)))) {
    const res = fail("rate_limited");
    res.headers.set("Retry-After", "60");
    return res;
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES + 64 * 1024) {
    return fail("bad_image", 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("bad_image");
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return fail("bad_image");
  if (file.size > MAX_IMAGE_BYTES) return fail("bad_image", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return fail("bad_image");

  if (deps.guards && !(await deps.guards.takeBudget())) {
    return done(fail("budget_exceeded"), { type: "error", code: "budget_exceeded" });
  }

  let provider: PenguinProvider;
  try {
    provider = deps.getProvider();
  } catch (err) {
    console.error("provider config error:", err instanceof Error ? err.message : "unknown");
    return done(fail("model_error", 500), { type: "error", code: "model_error" });
  }

  try {
    const result = await provider.countPenguins({ mime, bytes });
    const body: CountSuccess = { count: result.points.length, points: result.points };
    if (result.note) body.note = result.note;
    return done(Response.json(body), { type: "ok", count: result.points.length });
  } catch (err) {
    const code = err instanceof ProviderError ? err.code : "unexpected";
    console.error("provider failure:", code);
    return done(fail("model_error", code === "timeout" ? 504 : 502), { type: "error", code: "model_error" });
  }
}
