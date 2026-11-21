# find-me-penguin: Spec and Task Breakdown

Status: DRAFT for review. No code until the owner says "start".

## 1. Product

Upload or snap a photo; the app marks every penguin with a dot and shows the count. Playful tone, shareable result card. Hobby-grade accuracy. Mobile-first, multi-language.

### Decisions (locked)
| Area | Decision |
|---|---|
| Engine | Vision LLM, single pass, accept errors |
| Model (v1) | Anthropic Haiku behind a provider interface; OpenRouter added later |
| Photos | Anything; "penguin-like" counts (toys, statues, cartoons) |
| Output | Dots over the photo; count = number of points returned |
| Edit dots | None in v1 |
| Input | File picker + camera capture; one image at a time |
| Accounts / storage | None; stateless; nothing persisted server-side |
| Hosting | Next.js on Vercel (serverless) |
| Upload size | Resize/compress in browser (~1568px longest side, JPEG) |
| Rate limit | Upstash Redis, per IP, plus file-size cap |
| Response | Single JSON, no streaming |
| Share | Client-side canvas PNG; Web Share API with download fallback |
| Privacy | Notice only; EXIF dropped as a side effect of canvas re-encode |
| Errors | Friendly themed message, ask user to wait for the dev to fix; no auto-retry, no fallback model |
| Zero result | Playful "no penguins" message |
| Testing | Unit tests + small labeled eval set (~15 photos) |
| Extras | Mobile-first, i18n, monthly budget cap, custom domain + analytics |

## 2. Architecture

```
Browser (Next.js client)
  pick/capture -> decode -> resize+re-encode JPEG (strips EXIF)
  POST /api/count  (multipart or base64, <4.5MB)
        |
Vercel function /api/count
  1. rate limit (Upstash, by IP)  -> 429
  2. budget guard (Upstash counter) -> 503 "come back later"
  3. validate type/size
  4. provider.countPenguins(image) via adapter
  5. validate JSON with schema (zod); clamp points to [0,1]
  6. return { points:[{x,y}], note? }   // count = points.length
        |
Browser draws dots on canvas; count reveal animation; share card export
```

### Provider interface
`countPenguins(image: {mime, bytes}) -> Promise<{points: {x:number,y:number}[], note?: string}>`
- `AnthropicProvider` (Haiku) in v1.
- `OpenRouterProvider` later; chosen by env var `PROVIDER`.

### Data contract
Request: image (JPEG, max ~4MB after resize), `locale`.
Response 200: `{ count:number, points:[{x,y}] (normalized 0-1), note?:string }`
Errors: `{ error: "rate_limited"|"budget_exceeded"|"bad_image"|"model_error" }` with matching HTTP status. Client maps each to a localized themed message.

### Prompt design (to iterate against eval set)
Ask for JSON only: one point at the centre of each penguin-like figure, normalized coordinates, no stated total, optional short `note` for unusable photos. Validate and reject malformed output (no retry; surface `model_error`).

## 3. Frontend
- Mobile-first single page: hero, upload/camera buttons, preview, loading state, result view.
- Result: photo + dots, animated count, "share" (Web Share API -> PNG download fallback), "try another".
- i18n via next-intl (or similar); locale list TBD. Error and zero messages localized.
- Accessibility: buttons labeled, count announced via aria-live, dots have sufficient contrast.
- Privacy notice line near the upload button.

## 4. Cross-cutting
- Env: `ANTHROPIC_API_KEY`, `PROVIDER`, `UPSTASH_REDIS_REST_URL/TOKEN`, `MONTHLY_BUDGET_CALLS` (or cost estimate).
- Budget cap: count calls in Redis per month; refuse above a threshold. Also set a hard spend limit in the provider console.
- Analytics: privacy-friendly (e.g. Vercel Analytics or Plausible); track upload, success, error type, count bucket. Never images.
- Do not log image data or full IPs.

## 5. Risks
1. Haiku is weakest at dense counting and point placement. Mitigation: eval set, prompt tuning, easy model swap via the interface.
2. Points vs real count diverge in crowds; accepted for v1.
3. "Penguin-like" is subjective; prompt wording needs testing on puffins, auks, toys.
4. Phone camera photos are huge; resize must handle orientation (EXIF rotation) before stripping it.
5. Cost abuse via many IPs; budget cap is the backstop.

## 6. Task breakdown (ordered)
1. Scaffold Next.js + TS + lint + test runner; deploy empty app to Vercel.
2. Provider interface, zod schema, and mock provider; unit tests.
3. `/api/count` route: validation, error mapping (using mock provider).
4. Anthropic Haiku adapter + prompt v1.
5. Eval set: collect ~15 labeled photos, script to compare predicted vs true counts.
6. Prompt iteration against eval set; record results.
7. Upstash rate limiting + budget guard; tests.
8. Client image pipeline: orientation fix, resize, JPEG re-encode; tests.
9. UI: upload/camera, loading, result with dots and count animation.
10. Error and zero states with themed copy.
11. Share card (canvas PNG, Web Share API, download fallback).
12. i18n wiring and translations.
13. Analytics, privacy notice, accessibility pass.
14. Custom domain, env config, production smoke test on real phones.
15. OpenRouter adapter (post-v1).

## 7. Answers received
- Languages: EN + JA at launch (matches designs; recommended, others later).
- Budget: USD 5/month. Rough estimate for Haiku with a ~1568px image and a JSON reply is about 0.003-0.005 USD per call, so about 1000 calls. Update (task 4): Haiku 5.5 is priced at USD 0.10 / 0.50 per MTok, so a call is probably nearer 0.001 USD (~5000 calls per USD 5), to be confirmed from real `usage` numbers. Plan: call-based cap of 800/month in Upstash, plus a hard USD 5 limit in the provider console. Re-check against real usage numbers once built.
- Brand: "find-me-penguin" / "ペンギン探そう". No domain; use the Vercel URL for now.
- Camera: plain `<input type=file capture>`; no in-page stream.
- Backlog: analytics tool choice; sourcing of eval photos.

## 8. Design alignment (from mockups)
Screens provided: 1 Upload, 2 Counting, 3 Result, 4 Share cards (Tux dark / Snow JP / Zap lime), 5 Mascot, 10 No-penguins.

Visual system: near-black UI, lime (#D4FF5A-ish) accent, heavy display type, tally-mark penguin mascot with magnifier (lime background or outlined version on black), EN/JP toggle in the header.

Items in the designs that conflict with or extend the locked spec (see section 9):
- Bounding boxes with confidence % per penguin (spec says dots).
- Category chips: "5 real / 1 cartoon / 1 lookalike" (spec says one undifferentiated count).
- Live "3 found so far" and a progress bar (spec says single JSON, no streaming).
- "Count in background" + "Notify me when done" (needs a job queue and push; spec says stateless).
- "Link" share and "Save" (a link needs persistence; spec says canvas PNG only).
- "Flag a missed penguin" (needs a feedback channel; spec says no editing).
- Three share-card styles: Tux, Snow (JP), Zap.
- HEIC input listed on the upload screen.

## 9. Design conflicts: resolved
- Annotation: dots only. No boxes, no confidence %, no category chips. Result screen drops the chips row.
- Counting screen: fake progress of about 2-3 seconds with a penguin-finding animation, while one request runs. If the real response is slower, hold at ~90% until it returns. No "found so far", no background mode, no notify toggle.
- Result actions: Share (canvas PNG, Web Share API) + Save + Again. Link is dropped in v1.
- "Flag a missed penguin": backlog; hide the button.
- Zero-result screen kept (playful copy + tips + "Try another photo").
- Share cards: three styles (Tux, Snow JP, Zap); default Tux, Snow when locale is JA. User picks style in v1 or only default: TBD.
- HEIC: needs a decision (browser decode support is uneven; Safari converts on pick, others may not).

## 10. Backlog
Boxes/confidence/categories, live streaming count, background jobs + notifications, persisted Link, Flag a missed penguin, dot editing, OpenRouter adapter, analytics tool choice, eval photo sourcing, custom domain, more languages.

## 11. Final decisions
- Share cards: user picks among Tux (dark), Snow (JP), Zap (lime). Default Tux for EN, Snow for JA. Picker shown on the result screen before Share/Save.
- HEIC: supported in v1. Decode in the browser with a library (e.g. heic2any or libheif-js) when the browser cannot decode natively, then resize and re-encode to JPEG. Lazy-load the library only for HEIC files. Test on iPhone Safari and desktop Chrome.
- Mascot: recreate as SVG from the mockup (lime and outlined variants, app icons, EN/JP lockups). Rules: always on lime or snow; outlined version on black.
- Fonts: Google Fonts. Display: a heavy grotesque (candidates: Archivo Black / Dela Gothic One for JA display). Body: DM Sans. JA body: Noto Sans JP. Final pick when the UI is built.

## 12. Task list additions
- Task 8 now includes HEIC decode.
- Task 9/11: card style picker, three card templates (EN and JA copy).
- New task: SVG mascot, app icons, favicon, lockups.
- New task: font setup via next/font (Google), JA subset.

## 13. Deployment
- Decision: Vercel Git integration. Preview URL per branch/PR, production on merge to `main`.
- Owner action (outside the repo): import the GitHub repo in the Vercel dashboard and set env vars there (ANTHROPIC_API_KEY, PROVIDER, UPSTASH_REDIS_REST_URL/TOKEN, MONTHLY_BUDGET_CALLS). Create the Upstash database and the provider hard spend limit (USD 5).
- No deploy pipeline in the repo for v1. Optional later: a GitHub Actions workflow running lint and unit tests as a required check. Eval set stays manual (paid API calls).
- Task 1 becomes: scaffold the app, push to the branch, and confirm the Vercel preview builds.

## 14. Remaining questions
None blocking. Say "start" to begin at task 1.

## 15. Progress
- Task 1 done: scaffold, Vercel preview confirmed.
- Task 2 done: schema, provider interface, mock provider.
- Task 3 done: /api/count route.
- Task 4 done (mocked): Anthropic adapter (`claude-haiku-5-5`, prompt v1, no SDK retries, 25s timeout). Not yet run against the live API; that happens in task 5/6 with the eval set.
- Task 5 done: eval set of 15 labeled photos (9 positive incl. 1 cartoon and 1 dense colony, 6 negatives incl. goats as white-animal traps). Photos are gitignored (private and third-party images); `eval/manifest.json` holds the true counts. Run `npm run eval` (mock, free) or `npm run eval -- --live` (real model, spends API money, needs `PROVIDER=anthropic` and `ANTHROPIC_API_KEY`).
- Eval caveat: the live runner sends photos as-is. The browser resize step (task 8) does not exist yet, so large phone photos cost a little more than they will in production.
- Task 7 done: rate limit + monthly budget (Upstash). Order in `/api/count`: per-IP limit (5/min, 40/day, sliding window, keyed by hashed IP) -> validation -> monthly budget -> model call, so bad uploads cost no budget. Both checks fail closed on Redis errors. Production without Upstash env returns 500 rather than running the paid model unguarded; development without it runs unguarded on the mock. Budget cap from `MONTHLY_BUDGET_CALLS` (default 800), counter key `budget:YYYY-MM` (UTC).
- Task 6 (prompt tuning against the eval set) is waiting on an `ANTHROPIC_API_KEY`.
- Task 8 done: client image pipeline (`src/lib/image-pipeline.ts` logic, `src/lib/browser-image.ts` browser layer). Decode via `createImageBitmap` with EXIF orientation, fall back to `heic-to` (lazy 3.2 MB chunk) for HEIC, flatten transparency onto white, downscale to 1568px longest side, re-encode JPEG (quality 0.85, stepping down and shrinking if over 3.5 MB). Output carries no EXIF/GPS. Verified in headless Chromium with a real HEIC, an EXIF-rotated JPEG, a transparent PNG, a fake file and an empty file. Not yet verified on iPhone Safari (real-device test is part of task 14).
- Task 6 done (decision: keep prompt v1). Live eval, Haiku 5.5, 3 runs over the 15 photos: 14/15, 14/15, 15/15. Zero false positives across 18 negative checks (pavement, dog, futsal, three goat photos), every single-penguin photo correct every run, cartoon and reflection cases correct. Only the two crowded photos vary run to run: the 5-bird emperor huddle (once 7) and the ~55-bird colony (35, 41, 57). Dot placement is good on close-ups, loose on the huddle, and poor on the dense colony (many dots on bare ground, many birds unmarked). Not tuning the prompt further: the easy cases are saturated and 15 photos is too few to tune the hard cases without overfitting. Known limitation to show in the UI: counts above ~20 are approximate.
- Possible later improvements (backlog): hint "approximate" for large counts, try a stronger model for dense scenes via the provider interface, tiling for dense images, user dot editing.
- Task 9 done: UI. Screens: upload (drop zone, camera + library inputs, EN/JA toggle, privacy notice), counting (scan line, progress bar, rotating jokes, searching mascot), result, 20+, zero, error. Decisions made with the owner: lime picked by eye (`--lime: #d4ff4f`, one token in globals.css); marks are **X** instead of dots (lime with dark outline); "Count in background" returns to the upload screen with a status chip, no notifications; mascot is an animated SVG instead of a GIF (looks left/right holding the magnifier; confused variant with question marks); over 20 penguins shows "20+" with the confused mascot and **hides the X marks** (placement is unreliable in crowds); counts of exactly 20 or fewer show the exact number. Locale: EN/JA toggle, remembered in localStorage, defaults from the browser language. Fonts: Archivo Black (headings), DM Sans (body), Noto Sans JP (Japanese; 900 weight for headings), all via next/font/google. Favicon and `public/mascot.svg` generated from the Mascot component.
- Task 9 verification: 100 unit tests; 20 end-to-end checks in headless Chromium at phone size with a mocked API (3 / 0 / 20 / 25 penguins, 429 error, background flow, cancel, unreadable file, real HEIC, Japanese, locale persistence, no console errors). Not yet checked on a real iPhone (task 14).
- Not in the UI yet (task 11): Share and Save buttons and the three share cards.
- Task 11 done: share cards. Three styles drawn on a canvas at 1080x1350 (4:5): Tux (dark), Snow (white, default in Japanese), Zap (lime). User picks on the result screen via live thumbnails; Share uses the native share sheet when the browser can share files and falls back to a PNG download; Save always downloads. X marks are mapped through the same crop as the photo. 20+ results get a card too (no marks); zero results offer no sharing. Dots on the card footer = penguin count, capped at 10. Dismissing the share sheet is not treated as an error. Verified in headless Chromium: all 9 style/locale/count combinations rendered and visually reviewed, share and fallback paths checked with a stubbed share sheet. Not yet tried on a real iPhone (share sheet and file download behave differently on iOS Safari; task 14).
- Decision to confirm: "Zap, loud, for stories" is 4:5 like the other two rather than a tall 9:16 story format. Easy to change later.
- Task 14 (repo side) done: security headers (nosniff, frame deny, referrer policy, microphone/geolocation off; deliberately no CSP because the HEIC decoder needs relaxed script rules; camera policy left alone), `npm run smoke -- <url> [--live photo]` deployment check (verified against a deliberately unconfigured production build, where it fails with a hint, and a healthy local server), `DEPLOY.md` step-by-step setup with a phone test checklist, project README, `.env.example`.
- Task 14 (owner side) still open: create a fresh Anthropic key with a USD 5 spend limit and revoke the key that was pasted in chat; create the Upstash Redis database; add the five env vars in Vercel and redeploy; run the smoke script; run the phone checklist on a real iPhone. The latest Vercel build status could not be read from the development sandbox, so confirm in the Vercel dashboard that recent commits built.
- Task 13 done: accessibility, privacy, analytics, plus the bottom-padding fix. Layout: `viewport-fit=cover` and safe-area padding (about 88px clear space under the last buttons) so the iPhone Safari bar no longer covers Save/Again. Accessibility: focus moves to each screen's heading on change; result heading gives screen readers the final text instead of the count-up animation; the rotating joke is hidden from screen readers; card picker uses native radio inputs (arrow keys work); touch targets at least 40-44px; stronger control borders; descriptive photo alt text; `color-scheme: dark`. Verified with axe-core on 12 screen states (upload EN/JA, counting, result, 20+, zero, error, both background-chip states, privacy EN/JA): 0 violations. Colour contrast is a unit test (it caught a 2.99:1 border and was fixed). Privacy: `/privacy` page (EN/JA, linked from the upload screen) written from what the code really does. Analytics: anonymous daily counters in Upstash (ok by size group, model_error, budget_exceeded), no cookies or third-party scripts, read via token-protected `/api/stats` (404 unless `STATS_TOKEN` is set). Rate-limited and bad-upload requests are intentionally not counted. Japanese text (UI and privacy page) is still unreviewed by a native reader (task 12).
