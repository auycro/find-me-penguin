import { handleCount } from "@/lib/count-handler";
import { getProvider } from "@/lib/providers";

export const maxDuration = 30;

export async function POST(request: Request) {
  return handleCount(request, {
    getProvider: () =>
      getProvider(process.env.PROVIDER ?? (process.env.NODE_ENV === "production" ? undefined : "mock")),
  });
}
