import { handleCount } from "@/lib/count-handler";
import { guardsFromEnv } from "@/lib/limits";
import { getProvider } from "@/lib/providers";

export const maxDuration = 30;

const isProd = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  const guards = guardsFromEnv();
  if (!guards && isProd) {
    // Never run the paid model without limits in production.
    console.error("Upstash is not configured; refusing to serve /api/count");
    return Response.json({ error: "model_error" }, { status: 500 });
  }
  return handleCount(request, {
    guards,
    getProvider: () => getProvider(process.env.PROVIDER ?? (isProd ? undefined : "mock")),
  });
}
