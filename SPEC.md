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

## 7. Open questions
- Which languages at launch?
- Monthly budget number, and is the cap call-based or cost-based?
- Domain name?
- Analytics tool choice?
- Branding: name, mascot, colors?
- Camera capture: use `<input capture>` (simple) or in-page camera stream (more control)?
