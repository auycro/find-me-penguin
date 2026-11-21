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
- Budget: USD 5/month. Rough estimate for Haiku with a ~1568px image and a JSON reply is about 0.003-0.005 USD per call, so about 1000 calls. Plan: call-based cap of 800/month in Upstash, plus a hard USD 5 limit in the provider console. Re-check against real usage numbers once built.
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

## 13. Remaining questions
None blocking. Say "start" to begin at task 1.
