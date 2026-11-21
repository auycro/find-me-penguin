import { z } from "zod";
import type { Point } from "./schema";

export type CountErrorCode =
  | "rate_limited"
  | "budget_exceeded"
  | "bad_image"
  | "model_error"
  | "network";

export class CountClientError extends Error {
  readonly code: CountErrorCode;
  constructor(code: CountErrorCode) {
    super(code);
    this.name = "CountClientError";
    this.code = code;
  }
}

export type CountApiResult = { count: number; points: Point[]; note?: string };

const successSchema = z.object({
  count: z.number().int().nonnegative(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  note: z.string().optional(),
});

const KNOWN: ReadonlySet<string> = new Set(["rate_limited", "budget_exceeded", "bad_image", "model_error"]);

/** Send a prepared JPEG to /api/count. Aborts reject with the AbortError untouched. */
export async function requestCount(
  image: Blob,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<CountApiResult> {
  const doFetch = options.fetchImpl ?? fetch;
  const form = new FormData();
  form.set("image", image, "photo.jpg");

  let res: Response;
  try {
    res = await doFetch("/api/count", { method: "POST", body: form, signal: options.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new CountClientError("network");
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new CountClientError(res.ok ? "model_error" : codeFromStatus(res.status));
  }

  if (!res.ok) {
    const code = (body as { error?: unknown } | null)?.error;
    throw new CountClientError(typeof code === "string" && KNOWN.has(code) ? (code as CountErrorCode) : codeFromStatus(res.status));
  }

  const parsed = successSchema.safeParse(body);
  if (!parsed.success) throw new CountClientError("model_error");
  return parsed.data;
}

function codeFromStatus(status: number): CountErrorCode {
  if (status === 429) return "rate_limited";
  if (status === 503) return "budget_exceeded";
  if (status === 400 || status === 413) return "bad_image";
  return "model_error";
}
