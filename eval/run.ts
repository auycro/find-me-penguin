/**
 * Eval runner: sends each photo in eval/manifest.json through a provider and
 * compares the predicted count with the true count.
 *
 *   npm run eval              dry run with the mock provider (free)
 *   npm run eval -- --live    real model via PROVIDER=anthropic (spends API money)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { scoreRow, summarize, type EvalItem, type EvalRow } from "../src/lib/eval-score";
import { sniffMime } from "../src/lib/image";
import { PROMPT_VERSION } from "../src/lib/providers/prompt";
import { getProvider } from "../src/lib/providers";

const root = path.dirname(new URL(import.meta.url).pathname);
const live = process.argv.includes("--live");

async function main() {
  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8")) as {
    items: EvalItem[];
  };

  const providerName = live ? (process.env.PROVIDER ?? "anthropic") : "mock";
  const provider = getProvider(providerName);
  console.log(`provider=${provider.name} prompt=${PROMPT_VERSION} items=${manifest.items.length}`);
  if (!live) console.log("(dry run: mock provider, no API calls. Use --live for the real model.)");

  const rows: EvalRow[] = [];
  for (const item of manifest.items) {
    const bytes = new Uint8Array(readFileSync(path.join(root, "photos", item.file)));
    const mime = sniffMime(bytes);
    const base = { file: item.file, trueCount: item.trueCount, tolerance: item.tolerance };
    if (!mime) {
      rows.push({ ...base, predicted: null, error: "unsupported image" });
      continue;
    }
    try {
      const result = await provider.countPenguins({ mime, bytes });
      rows.push({ ...base, predicted: result.points.length });
    } catch (err) {
      const code = err instanceof Error && "code" in err ? String(err.code) : "error";
      rows.push({ ...base, predicted: null, error: code });
    }
  }

  const scored = rows.map(scoreRow);
  for (const r of scored) {
    const mark = r.pass ? "PASS" : "FAIL";
    const got = r.predicted === null ? `error(${r.error})` : String(r.predicted);
    console.log(`${mark}  true=${String(r.trueCount).padStart(2)} got=${got.padStart(3)}  ${r.file}`);
  }

  const s = summarize(scored);
  console.log(
    `\npassed ${s.passed}/${s.total} (${(s.passRate * 100).toFixed(0)}%)` +
      `  MAE(positives)=${s.maeOnPositives?.toFixed(2) ?? "n/a"}` +
      `  false positives=${s.falsePositives}/${s.negatives}` +
      `  misses=${s.misses}/${s.positives}  failed calls=${s.failedCalls}`,
  );

  if (live) {
    const dir = path.join(root, "results");
    mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    writeFileSync(
      out,
      JSON.stringify({ provider: provider.name, prompt: PROMPT_VERSION, summary: s, rows: scored }, null, 2),
    );
    console.log(`saved ${path.relative(process.cwd(), out)}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
