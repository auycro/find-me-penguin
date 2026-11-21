# Find Me Penguin · ペンギン探そう

Upload or take a photo and the app counts the penguins, marking each one with an **X**. Real, cartoon or toy penguins all count. Shareable result cards, English and Japanese.

Next.js (App Router) on Vercel. A vision model (Anthropic Haiku by default, behind a provider interface) does the counting. Photos are resized in the browser, sent once, and never stored.

## How it works

### Architecture

Photos are prepared in the browser, counted by a vision model behind a thin server route, and never stored. Redis holds only counters.

```mermaid
flowchart LR
    subgraph Browser["Browser (Next.js client)"]
        UI["UI screens<br/>upload, counting, result"]
        PIPE["Image pipeline<br/>HEIC decode, fix rotation,<br/>resize to 1568px, JPEG,<br/>strip EXIF and GPS"]
        CARDS["Share cards<br/>canvas PNG, native share"]
        LS[("localStorage<br/>language only")]
    end

    subgraph Vercel["Vercel (serverless)"]
        COUNT["POST /api/count"]
        STATS["GET /api/stats<br/>token protected"]
        PAGES["Pages: /, /privacy"]
    end

    subgraph Upstash["Upstash Redis"]
        RL[("Rate limit<br/>5 per min, 40 per day<br/>hashed IP")]
        BUD[("Monthly call budget")]
        ST[("Anonymous daily totals")]
    end

    LLM["Anthropic API<br/>Claude Haiku 5.5<br/>(provider interface)"]

    UI --> PIPE
    PIPE -- "JPEG, under 4 MB" --> COUNT
    COUNT -- "points, count" --> UI
    UI --> CARDS
    UI --- LS
    COUNT --> RL
    COUNT --> BUD
    COUNT -- "image, prompt" --> LLM
    LLM -- "JSON points" --> COUNT
    COUNT --> ST
    STATS --> ST
    PAGES --> UI
```

### One count, step by step

The order matters: cheap checks run first, and the monthly budget is spent only after a photo passes validation, so bad uploads cost nothing.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser
    participant A as /api/count
    participant R as Upstash Redis
    participant M as Anthropic API

    U->>B: pick or take a photo
    B->>B: decode (HEIC if needed), rotate, resize, re-encode JPEG
    B->>A: POST multipart image

    A->>R: per-IP rate limit (hashed IP)
    alt over the limit
        A-->>B: 429 rate_limited
    end

    A->>A: check size and magic bytes
    alt not a usable image
        A-->>B: 400 or 413 bad_image
    end

    A->>R: take one unit of monthly budget
    alt budget used up
        A->>R: count budget_exceeded
        A-->>B: 503 budget_exceeded
    end

    A->>M: image + prompt
    M-->>A: JSON points
    alt model failed, refused or invalid JSON
        A->>R: count model_error
        A-->>B: 502 or 504 model_error
    else success
        A->>A: validate, clamp points to 0..1
        A->>R: count ok by size group
        A-->>B: 200 count and points
    end

    B->>B: draw X marks, show count (20+ if over 20)
    Note over A,R: If Redis errors during the limit checks, the request is refused.<br/>Errors in the stats counters are ignored and never change the response.
```

### Screen flow

"Count in background" returns to the upload screen while the request keeps running. A status chip shows progress and becomes tappable once the result (or an error) is ready.

```mermaid
stateDiagram-v2
    [*] --> Upload
    Upload --> Counting: photo picked and prepared
    Upload --> Upload: file rejected (inline message)

    Counting --> Result: answer received
    Counting --> Error: request failed
    Counting --> Upload: Cancel (request aborted)
    Counting --> Background: Count in background

    state "Upload + status chip" as Background
    Background --> Result: chip tapped after it finished
    Background --> Error: chip tapped after it failed

    state Result {
        [*] --> Exact: 1 to 20 penguins
        [*] --> Crowd: more than 20 (shows 20+)
        [*] --> Zero: none found
    }

    Result --> Upload: Again / close
    Error --> Upload: Try another photo
```

### Code map

| Area | Where |
|---|---|
| Screens and state machine | `src/components/`, `src/lib/flow.ts` |
| Browser image pipeline (HEIC, rotation, resize) | `src/lib/image-pipeline.ts`, `src/lib/browser-image.ts` |
| Counting route and its checks | `src/app/api/count/route.ts`, `src/lib/count-handler.ts` |
| Model providers (swap models here) | `src/lib/providers/` (`PenguinProvider` interface, Anthropic adapter, mock) |
| Prompt | `src/lib/providers/prompt.ts` |
| Output validation | `src/lib/schema.ts` |
| Rate limit and monthly budget | `src/lib/limits.ts` |
| Anonymous usage counters | `src/lib/stats.ts`, `src/lib/stats-handler.ts` |
| Share cards | `src/lib/share-card.ts`, `src/lib/card-layout.ts`, `src/components/ShareCards.tsx` |
| Translations (EN and JA) | `src/lib/i18n.ts` |

## Develop

```bash
npm install
npm run dev          # uses the mock provider (3 fixed points) when PROVIDER is unset
npm test             # unit tests
npm run typecheck
npm run lint
```

Copy `.env.example` to `.env.local` and fill it in to use the real model (`PROVIDER=anthropic`).

## Other scripts

```bash
npm run eval                  # score the labeled photos with the mock (free)
npm run eval -- --live        # score with the real model (spends API money)
npm run smoke -- https://URL  # check a deployed copy
```

The eval photos are not in git (they include private and third-party images). `eval/manifest.json` lists the files and true counts; put the photos in `eval/photos/`.

## Privacy and accessibility

- `/privacy` explains exactly what is and isn't kept (also in Japanese). Keep it in step with the code if behaviour changes.
- Usage is measured with anonymous daily counters in Redis (`src/lib/stats.ts`), viewable at `/api/stats` when `STATS_TOKEN` is set. No cookies, no third-party analytics.
- Screens were checked with axe-core (WCAG 2.2 AA rules) and keyboard navigation; colour contrast is locked in by `src/lib/contrast.test.ts`.

## Deploying

See [DEPLOY.md](./DEPLOY.md). In production the counting route refuses to run unless the Upstash rate-limit variables are set, so the paid model can never run unguarded.

## Design and decisions

See [SPEC.md](./SPEC.md).
