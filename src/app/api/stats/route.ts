import { connection } from "next/server";
import { handleStats } from "@/lib/stats-handler";
import { statsFromEnv } from "@/lib/stats";

export async function GET(request: Request) {
  // Opt out of build-time prerendering: the token and Redis are only known at request time,
  // and this response must never be frozen into the build.
  await connection();
  return handleStats(request, { token: process.env.STATS_TOKEN, stats: statsFromEnv() });
}
