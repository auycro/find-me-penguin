import { MAX_IMAGE_BYTES, sniffMime } from "./image";
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
  /** Resolved lazily so a misconfigured provider becomes a clean model_error. */
  getProvider: () => PenguinProvider;
};

/**
 * POST handler body for /api/count.
 * Expects multipart/form-data with an `image` file. Nothing is stored or logged.
 * Rate limiting and the budget guard are added in a later task, before the provider call.
 */
export async function handleCount(request: Request, deps: CountDeps): Promise<Response> {
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

  let provider: PenguinProvider;
  try {
    provider = deps.getProvider();
  } catch (err) {
    console.error("provider config error:", err instanceof Error ? err.message : "unknown");
    return fail("model_error", 500);
  }

  try {
    const result = await provider.countPenguins({ mime, bytes });
    const body: CountSuccess = { count: result.points.length, points: result.points };
    if (result.note) body.note = result.note;
    return Response.json(body);
  } catch (err) {
    const code = err instanceof ProviderError ? err.code : "unexpected";
    console.error("provider failure:", code);
    return fail("model_error", code === "timeout" ? 504 : 502);
  }
}
