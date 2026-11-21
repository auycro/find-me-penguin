import { Redis } from "@upstash/redis";

/**
 * Anonymous aggregate counters, one Redis hash per UTC day. No photos, IPs or identifiers:
 * only "how many counts succeeded (by size group)" and "how many server-side failures".
 */

export type Bucket = "zero" | "one" | "few" | "some" | "crowd";
export const BUCKETS: readonly Bucket[] = ["zero", "one", "few", "some", "crowd"];

/** none, 1, 2-5, 6-20, more than 20 (matches the "20+" screen). */
export function bucketOf(count: number): Bucket {
  if (count <= 0) return "zero";
  if (count === 1) return "one";
  if (count <= 5) return "few";
  if (count <= 20) return "some";
  return "crowd";
}

export type StatEvent = { type: "ok"; count: number } | { type: "error"; code: "model_error" | "budget_exceeded" };

export type StatsStore = {
  hincrby(key: string, field: string, by: number): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  hgetall(key: string): Promise<Record<string, unknown> | null>;
};

export type DayStats = {
  date: string;
  ok: number;
  buckets: Record<Bucket, number>;
  errors: Record<string, number>;
};

export type StatsSummary = { days: DayStats[]; totals: Omit<DayStats, "date"> };

export type Stats = {
  /** Never throws and never blocks a request on failure. */
  record(event: StatEvent): Promise<void>;
  summary(days: number): Promise<StatsSummary>;
};

const KEEP_SECONDS = 95 * 24 * 60 * 60;

export function dateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const keyFor = (date: string) => `stats:${date}`;

const emptyBuckets = (): Record<Bucket, number> => ({ zero: 0, one: 0, few: 0, some: 0, crowd: 0 });

export function createStats(store: StatsStore, now: () => Date = () => new Date()): Stats {
  return {
    async record(event) {
      try {
        const key = keyFor(dateString(now()));
        const fields = event.type === "ok" ? ["ok", `bucket:${bucketOf(event.count)}`] : [`err:${event.code}`];
        await Promise.all(fields.map((f) => store.hincrby(key, f, 1)));
        await store.expire(key, KEEP_SECONDS);
      } catch (err) {
        console.error("stats record failed:", err instanceof Error ? err.name : "unknown");
      }
    },

    async summary(days) {
      const n = Math.min(90, Math.max(1, Math.floor(days)));
      const today = now();
      const dates = Array.from({ length: n }, (_, i) => dateString(new Date(today.getTime() - i * 86_400_000)));
      const rows = await Promise.all(dates.map((d) => store.hgetall(keyFor(d))));

      const totals = { ok: 0, buckets: emptyBuckets(), errors: {} as Record<string, number> };
      const out: DayStats[] = dates.map((date, i) => {
        const day: DayStats = { date, ok: 0, buckets: emptyBuckets(), errors: {} };
        for (const [field, raw] of Object.entries(rows[i] ?? {})) {
          const v = Number(raw);
          if (!Number.isFinite(v)) continue;
          if (field === "ok") day.ok = v;
          else if (field.startsWith("bucket:")) {
            const b = field.slice(7) as Bucket;
            if (b in day.buckets) day.buckets[b] = v;
          } else if (field.startsWith("err:")) day.errors[field.slice(4)] = v;
        }
        totals.ok += day.ok;
        for (const b of BUCKETS) totals.buckets[b] += day.buckets[b];
        for (const [k, v] of Object.entries(day.errors)) totals.errors[k] = (totals.errors[k] ?? 0) + v;
        return day;
      });
      return { days: out, totals };
    },
  };
}

/** Real stats backed by Upstash Redis, or null when Upstash is not configured. */
export function statsFromEnv(env: NodeJS.ProcessEnv = process.env): Stats | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  const redis = Redis.fromEnv();
  return createStats({
    hincrby: (key, field, by) => redis.hincrby(key, field, by),
    expire: (key, seconds) => redis.expire(key, seconds),
    hgetall: (key) => redis.hgetall<Record<string, unknown>>(key),
  });
}
