/**
 * Smoke test for a deployed (or local) copy of the app.
 *
 *   npm run smoke -- https://your-app.vercel.app
 *   npm run smoke -- https://your-app.vercel.app --live path/to/photo.jpg
 *
 * Without --live nothing is sent to the AI model, so it costs nothing.
 * With --live one real photo is counted (one model call, one unit of monthly budget).
 * Each run uses a couple of requests from the per-IP rate limit, so don't loop it.
 */
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const base = args.find((a) => /^https?:\/\//.test(a))?.replace(/\/$/, "");
const liveIdx = args.indexOf("--live");
const livePhoto = liveIdx >= 0 ? args[liveIdx + 1] : undefined;

if (!base || (liveIdx >= 0 && !livePhoto)) {
  console.error("Usage: npm run smoke -- <https://base-url> [--live <photo.jpg>]");
  process.exit(2);
}

let failed = 0;
function check(ok: boolean, name: string, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
}

async function main() {
  // 1. Home page
  const home = await fetch(`${base}/`);
  const html = await home.text();
  check(home.status === 200, "home page loads", `HTTP ${home.status}`);
  check(html.includes("Find Me Penguin"), "home page has the app title");

  // 2. Favicon
  const icon = await fetch(`${base}/icon.svg`);
  check(icon.status === 200 && (icon.headers.get("content-type") ?? "").includes("svg"), "favicon is served");

  // 3. Security headers
  check(home.headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options is set");
  check(home.headers.get("x-frame-options") === "DENY", "X-Frame-Options is set");
  check(!home.headers.has("x-powered-by"), "X-Powered-By is hidden");

  // 4. API wrong method
  const get = await fetch(`${base}/api/count`);
  check(get.status === 405, "GET /api/count is rejected", `HTTP ${get.status}`);

  // 5. API validation: a text file must be refused before any model call
  const form = new FormData();
  form.set("image", new File(["this is not an image"], "x.jpg", { type: "image/jpeg" }));
  const bad = await fetch(`${base}/api/count`, { method: "POST", body: form });
  const badBody = (await bad.json().catch(() => ({}))) as { error?: string };
  if (bad.status === 500) {
    check(false, "API accepts requests", "HTTP 500: server is not configured. Check UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN and PROVIDER in Vercel, then redeploy");
  } else if (bad.status === 429) {
    check(false, "API validation", "HTTP 429: rate limited. Wait a minute and run again");
  } else if (bad.status === 503) {
    check(false, "API validation", `HTTP 503 (${badBody.error}): monthly budget is used up or Redis is unreachable`);
  } else {
    check(bad.status === 400 && badBody.error === "bad_image", "non-image upload is refused", `HTTP ${bad.status}`);
  }

  // 6. Optional: one real count
  if (livePhoto) {
    const bytes = readFileSync(livePhoto);
    const f = new FormData();
    f.set("image", new File([bytes], "photo.jpg", { type: "image/jpeg" }));
    const t0 = Date.now();
    const res = await fetch(`${base}/api/count`, { method: "POST", body: f });
    const body = (await res.json().catch(() => ({}))) as { count?: number; points?: unknown[]; error?: string };
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    check(
      res.status === 200 && typeof body.count === "number" && Array.isArray(body.points) && body.points.length === body.count,
      "live count works",
      res.status === 200 ? `count=${body.count}, ${secs}s` : `HTTP ${res.status} ${body.error ?? ""}`,
    );
  } else {
    console.log("SKIP  live count (add --live <photo.jpg> to spend one model call)");
  }

  console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test could not run:", err instanceof Error ? err.message : err);
  process.exit(2);
});
