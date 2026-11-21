# Deploying find-me-penguin

Everything below can be done from a phone browser. Order matters: set the limits first, then the keys.

## 1. Anthropic (the model)

1. Open the Anthropic Console in your browser and sign in.
2. **Create a new API key just for this app** (name it `find-me-penguin-prod`).
   Don't reuse a key that was ever pasted into a chat or a message. Revoke any such key.
3. **Set a spend limit** for the workspace (Settings, then Limits). Suggested: **USD 5/month**.
   This is the hard backstop. The app's own call cap (below) is the soft one.

## 2. Upstash (rate limit and monthly budget counter)

1. In the Upstash console, create a **Redis** database. The free plan is enough.
2. Pick a region close to where your Vercel functions run (Vercel project, Settings, Functions).
3. Open the database's **REST API** section and copy two values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   Use the REST ones, not the `redis://` connection string.

## 3. Vercel (hosting)

Project, Settings, Environment Variables. Add these for **Production**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | the new key from step 1 |
| `PROVIDER` | `anthropic` |
| `UPSTASH_REDIS_REST_URL` | from step 2 |
| `UPSTASH_REDIS_REST_TOKEN` | from step 2 |
| `MONTHLY_BUDGET_CALLS` | `800` to start (see "Budget" below) |

Optional: `ANTHROPIC_MODEL` (defaults to `claude-haiku-5-5`).

Preview deployments get their own environment. If you want to test a preview with the real model, add the same variables to **Preview** too. They'd share the same Upstash database and spend limit. Without them a preview refuses to count, on purpose.

**Variables only take effect on a new deployment.** After adding or changing them, redeploy (Deployments, the three dots, Redeploy).

## 4. Check it

From a computer (or any machine with Node and this repo):

```bash
npm run smoke -- https://YOUR-APP.vercel.app
npm run smoke -- https://YOUR-APP.vercel.app --live path/to/photo.jpg   # spends one model call
```

The first form costs nothing. If the API check fails with HTTP 500, one of the variables in step 3 is missing or the deployment predates them.

## 5. Phone checklist (iPhone Safari, then Android Chrome)

- [ ] Home page loads, text is readable, no horizontal scrolling
- [ ] **Take a photo** opens the camera; the photo is counted
- [ ] **Choose from library** with a **HEIC** photo works (first HEIC may take a few seconds)
- [ ] A photo taken in portrait is not rotated sideways
- [ ] Counting animation plays; **Count in background** returns to the start and the chip finishes
- [ ] X marks sit on the penguins in a clear shot; a crowd shows **20+**
- [ ] A photo with no penguins shows the "Suspicious" screen
- [ ] **Share** opens the share sheet with a PNG; **Save** saves the image (note where it lands)
- [ ] All three card styles look right; Japanese toggle switches language and card default
- [ ] Airplane mode gives the "can't reach the server" message, not a blank screen

## 6. Budget and monitoring

- The app counts one unit per model call per month and refuses new counts above `MONTHLY_BUDGET_CALLS`.
- Haiku 5.5 is cheap, so 800 calls is very conservative. After a few days of use, look at actual spend in the Anthropic Console, work out the cost per call, and raise the cap accordingly. Keep the console spend limit as the hard stop either way.
- Per visitor: 5 photos per minute and 40 per day, by hashed IP (`src/lib/limits.ts`).
- If counts suddenly start failing with "penguin counters are resting", the monthly cap was reached.

## 7. Later

- Custom domain: Vercel, Settings, Domains.
- Analytics: not set up yet (backlog).
