# Load Tester: Feature Plan

A local tool to test how a website or API behaves under different numbers of concurrent users. It is a **Next.js app** (App Router, TypeScript) that runs on your machine, and it also ships a command line interface that shares the same engine.

Status legend:

| Mark | Meaning |
|------|---------|
| Done | Built and smoke tested |
| Planned | Part of the agreed scope, not built yet |
| Suggested | Optional idea, waiting for your decision |

---

## 1. Goals

- Answer one question clearly: **"How many concurrent users can this site handle before it gets slow or starts failing?"**
- Setup in under a minute: `npm install`, `npm start`, open the browser.
- Work fully offline on localhost (no cloud account, no external services).
- Keep results so runs can be compared over time.

### Non-goals (for v1)

- Testing from many machines or regions at once (see suggestion S12).
- Measuring browser rendering time (JavaScript, images, CSS). v1 measures server response only (see suggestion S14).
- Attacking sites you do not own. The tool is for testing your own or authorized systems.

---

## 2. How it works

```
+----------------------+       +-------------------------+        +------------------+
|  React pages         | fetch |  Next.js Route Handlers | events |  Load engine     |
|  app/page.tsx        | ----> |  app/api/tests          | <----- |  lib/engine.ts   |
|  app/reports/...     |  SSE  |  app/api/events (SSE)   | -----> |  virtual users   |
|  (client components) | <---- |  app/api/reports        |  start +--------+---------+
+----------------------+       +------------+------------+                 |
                                            |                              v
                               lib/runner.ts (one running test,     Target site / API
                               kept on globalThis)                  (your server)
                                            |
+----------------------+                    v
|  CLI  cli/cli.ts     | ---------->  reports/*.json
|  (same lib/engine)   |
+----------------------+
```

Next.js specific points:

- All API routes use the **Node.js runtime** (`export const runtime = 'nodejs'`), not Edge, because the engine needs `node:http`.
- The running test lives in a **module singleton stored on `globalThis`**, so it survives hot reload in `next dev` and every route sees the same test.
- Live updates use a Route Handler that returns a **`ReadableStream` as Server-Sent Events** (`export const dynamic = 'force-dynamic'`).
- The app is meant for **`next dev` / `next start` on your machine**. It will not work on serverless hosting like Vercel, because a test runs for minutes in one long-lived process.
- The demo target stays a **separate process on its own port**. If it ran inside the same Next.js server, the tool would be load testing itself and the numbers would be wrong.

- A **virtual user (VU)** is a loop: send request, wait for the response, optionally pause ("think time"), repeat.
- A **stage** is a fixed number of VUs running for a fixed duration, for example "50 users for 30 seconds".
- A test runs **stages one after another** (for example 10, 50, 100, 200 users). Each stage gets its own summary, so you can see exactly where performance drops.

---

## 3. Features in scope

### 3.1 Load engine (`lib/engine.ts`)

| Feature | Details | Status |
|---------|---------|--------|
| Stepped stages | List of `{ users, duration }`, run in order | Done |
| Concurrent virtual users | Up to 10,000 VUs per stage | Done |
| Ramp-up | Spread VU start over N seconds inside each stage, so the server is not hit by everyone at the same millisecond | Done |
| Think time | Pause in ms between requests per VU, to mimic real people | Done |
| HTTP methods | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS | Done |
| Custom headers and body | Any headers, raw body. Content-Type defaults to JSON when a body is set | Done |
| HTTP and HTTPS | Picks the right client from the URL | Done |
| Keep-alive connections | Reuses connections like a real browser does | Done |
| Request timeout | Default 10 s, counted as error `TIMEOUT` | Done |
| Stop anytime | Aborts sleeps and in-flight requests right away. Aborted requests are not counted | Done |
| Config validation | Clear error messages for bad URL, method, users, durations | Done |

### 3.2 Metrics

Collected per stage and per second (live).

| Metric | Meaning | Status |
|--------|---------|--------|
| Requests per second (RPS) | Throughput the server delivered | Done |
| Latency avg, min, max | Response time in ms | Done |
| Latency p50, p90, p95, p99 | "95% of requests were faster than X ms". Better than average for spotting slow outliers | Done |
| Error rate | % of requests with network error or HTTP status 400+ | Done |
| Status code breakdown | Count per status (200, 404, 503...) | Done |
| Error types | Count per error (`HTTP 503`, `ECONNREFUSED`, `TIMEOUT`...) | Done |
| Bytes per second | Response data throughput | Done |
| Active users | How many VUs are running right now (useful during ramp-up) | Done |

Latency uses a fixed-size histogram (0.1 ms precision, up to 60 s), so memory stays flat even with millions of requests.

### 3.3 SLA verdict

You set two limits: **max p95 latency** (default 1000 ms) and **max error rate** (default 1%).

- Each stage is marked **OK** or **FAIL** against these limits.
- The report states: *"Handled up to **N** concurrent users within SLA"* and *"Broke at **M** users: p95 1840 ms > 1000 ms"*.
- Status: Done

### 3.4 Web dashboard (Next.js pages)

Pages (App Router):

| Route | Purpose |
|-------|---------|
| `/` | New test form + live view of the running test |
| `/reports` | History of past runs |
| `/reports/[id]` | One saved report with charts and stage table |

Components (`components/`): `TestForm`, `StageEditor`, `HeaderRows`, `LiveStats`, `TimelineChart`, `UsersLatencyChart`, `StageTable`, `VerdictBanner`, `ErrorBreakdown`, `ReportList`. Charts and live parts are client components (`'use client'`). Report pages are server components that read the JSON file directly.

| Feature | Details | Status |
|---------|---------|--------|
| Test form | URL, method, headers (key/value rows), body, timeout, think time, ramp-up, SLA limits | Done |
| Stage editor | Add or remove rows of users and duration. Presets: Quick (10/50/100), Standard (10/50/100/200/500), Stress (100/500/1000/2000) | Done |
| Start and Stop buttons | One test at a time. Stop is instant | Done |
| Live stat tiles | Active users, RPS, p95, error rate, total requests | Done |
| Live timeline chart | RPS and p95 over time, with stage boundaries marked | Done |
| Stage comparison table | One row per user level, SLA OK/FAIL highlighted | Done |
| Users vs latency chart | Shows the point where response time climbs | Done |
| Verdict banner | Max users within SLA and the reason it broke | Done |
| Error breakdown | Status codes and error types per stage | Done |
| Report history | List of past runs, open or delete one | Done |
| Live updates | Server-Sent Events, so refreshing the page keeps the running test | Done |
| Burgundy and off-white theme | See section 3.10. Dark mode variant follows system setting | Done |

### 3.5 CLI (`cli/cli.ts`)

Runs with `tsx`, imports the same `lib/engine.ts` as the web app.

```bash
npm run cli -- -u http://localhost:3000/api -n 10,50,100,200 -d 30 -r 5
```

| Feature | Status |
|---------|--------|
| All engine options as flags (`--users`, `--duration`, `--ramp-up`, `--header`, `--body`, `--think-time`, `--timeout`, `--sla-p95`, `--sla-errors`) | Done |
| `--config test.json` to load a saved test | Done |
| Live line per second, results table at the end | Done |
| `--json` output for scripts | Done |
| Exit code 2 when SLA fails (for CI pipelines) | Done |
| Ctrl+C stops cleanly and still saves the report | Done |

### 3.6 Reports (`lib/reports.ts`)

| Feature | Status |
|---------|--------|
| Every run saved to `reports/<timestamp>.json` (config, stages, verdict) | Done |
| API: list, read, delete reports | Done |

API routes (Route Handlers):

| Method and path | Purpose |
|-----------------|---------|
| `POST /api/tests` | Validate config and start a test (409 if one is running) |
| `POST /api/tests/stop` | Stop the running test |
| `GET /api/events` | SSE stream: snapshot, stageStart, tick, stageEnd, done |
| `GET /api/reports` | List saved reports |
| `GET /api/reports/[id]` | One report |
| `DELETE /api/reports/[id]` | Delete a report |

### 3.7 Demo target (`demo/target.ts`)

A practice site that behaves like a real server with limited capacity: it handles 20 requests at a time, queues the rest (so latency grows), and returns `503` when the queue is full.

| Endpoint | Behavior |
|----------|----------|
| `GET /` | Fast page, about 5 ms |
| `GET /api` | About 30 ms of work, capacity limited |
| `GET /slow` | 100 to 400 ms |
| `POST /login` | About 50 ms, echoes body size |

Status: Done. Smoke test result: 50 users OK (p95 91 ms), 400 users FAIL (97% `503`).

### 3.8 Safety

| Feature | Status |
|---------|--------|
| Dashboard listens on `127.0.0.1` only (`next dev -H 127.0.0.1` in the npm scripts) | Done |
| Hard limits: 10,000 users per stage, 1 hour per stage | Done |
| README warning: only test sites you own or have permission to test | Done |

### 3.9 Docs and setup

| Item | Status |
|------|--------|
| `README.md`: install, run dashboard, run CLI, try the demo, read the results | Done |
| `npm run dev`, `npm run build && npm start`, `npm run cli`, `npm run target` scripts | Done |

### 3.10 Theme: burgundy and off-white

Defined once as CSS variables in `app/globals.css` and mapped to Tailwind colors, so every component uses tokens, never raw hex values.

| Token | Light | Dark | Used for |
|-------|-------|------|----------|
| `--bg` | `#FAF7F2` off-white | `#1C1315` | Page background |
| `--surface` | `#FFFDF9` | `#271A1D` | Cards, form, tables |
| `--border` | `#E7DED3` | `#3D2A2E` | Card and input borders |
| `--text` | `#2A1A1D` | `#F5EFE6` | Main text |
| `--muted` | `#6F5F62` | `#B5A7A0` | Labels, secondary text |
| `--primary` | `#800020` burgundy | `#E07A8F` (lines, links); buttons use `--primary-fill` `#8E1B33` | Buttons, links, active tab, main chart line |
| `--primary-hover` | `#650019` | `#D6637A` | Button hover |
| `--primary-soft` | `#F3E4E6` | `#3A2026` | Selected rows, badges, focus ring |
| `--accent` | `#9A7440` warm gold | `#CDAA72` | Second chart line (p95), highlights |
| `--ok` | `#2F6B4F` | `#6FBF94` | SLA OK badge |
| `--fail` | `#C2410C` orange-red | `#FF8A5B` | SLA FAIL, error rate |

Notes:

- **Errors use orange-red, not red.** `#C2410C` instead of the first idea `#D9480F`, which failed AA contrast for small text on off-white. Plain red would look almost the same as burgundy, so a failing stage would not stand out from normal buttons.
- Burgundy is used for actions and the main data line only. Large areas stay off-white so the page stays calm and readable.
- Fonts: a serif for headings (for example *Fraunces*) to match the burgundy feel, a clean sans for body (*Inter*), and a mono for numbers (*JetBrains Mono*), loaded with `next/font` so they work offline after the first build.
- All text and badge color pairs to be checked for WCAG AA contrast (4.5:1) in both light and dark.

---

## 4. Suggested features

Ranked by how useful they are compared to the effort. Pick the ones you want and I will add them to the plan.

### High value, low or medium effort (recommended for v1)

| ID | Feature | Why it helps | Effort |
|----|---------|--------------|--------|
| S1 | **Response checks (assertions)** | A page can return 200 but show an error message. Check status code, "body contains text", or a JSON field value. Failed checks count as errors | Medium |
| S2 | **Auth helpers** | Bearer token, Basic auth and Cookie fields in the form, instead of typing raw headers | Low |
| S3 | **Import from cURL** | Paste a `curl` command copied from browser DevTools and the form fills itself | Low |
| S4 | **Saved test templates** | Save a config with a name, run it again in one click | Low |
| S5 | **Compare two runs** | Pick two reports, see them side by side (before vs after a code change or server upgrade) | Medium |
| S6 | **Export report** | Download as CSV (for Excel) or a standalone HTML page to share with the team | Medium |
| S7 | **Latency histogram chart** | Shows how response times spread, not only averages | Low |
| S8 | **Remote target warning** | Confirm dialog when the URL is not localhost, as a guard against hitting the wrong site | Low |

### High value, bigger effort (good for v2)

| ID | Feature | Why it helps | Effort |
|----|---------|--------------|--------|
| S9 | **User journeys (multi-step scenarios)** | Real users do several things: open home, log in, browse products, add to cart. Each VU runs the steps in order, with per-step metrics | High |
| S10 | **Variables and data files** | Take a token from the login response and use it in the next request. Load a CSV of usernames so each VU logs in as a different user | High (needs S9) |
| S11 | **More load patterns** | **Spike** (sudden jump), **Soak** (steady load for hours to find memory leaks), **Breakpoint** (keep adding users until SLA breaks, auto-detect the limit), **Fixed RPS** (send exactly N requests per second regardless of response speed) | Medium to High |
| S12 | **Distributed workers** | One machine tops out at a few thousand users. Run worker processes on several machines, controlled by one dashboard | High |
| S13 | **Target server monitoring** | Show CPU and memory of the server under test next to the latency chart, so you see *why* it slows down (only works when the target is on your machine or exposes metrics) | Medium |
| S14 | **Real browser test** | Use Playwright to load the page in a few real browsers and measure full page load time (JS, images, CSS) alongside the HTTP load | High |

### Nice to have

| ID | Feature | Why it helps | Effort |
|----|---------|--------------|--------|
| S15 | **Docker setup** | `docker compose up` instead of installing Node | Low |
| S16 | **Notifications** | Slack or email message when a long test finishes | Low |
| S17 | **Scheduled runs** | Run a test every night and keep a performance trend chart | Medium |
| S18 | **Dashboard login** | Password protection if the dashboard is shared on a network | Low |
| S19 | **Random think time** | Pause between 1 and 3 s instead of a fixed value, closer to real people | Low |
| S20 | **HTTP/2 support** | Test sites the way modern browsers connect to them | Medium |

---

## 5. Proposed roadmap

| Phase | Content |
|-------|---------|
| **v1 (current)** | Next.js conversion (section 8), dashboard, README, verification, plus chosen items from S1 to S8 |
| **v1.1** | S11 load patterns (Breakpoint and Spike first), S15 Docker |
| **v2** | S9 user journeys, S10 variables and data files, S13 monitoring |
| **v3** | S12 distributed workers, S14 real browser test, S17 scheduled runs |

---

## 6. Tech stack

| Part | Choice | Reason |
|------|--------|--------|
| Framework | Next.js (latest, App Router) | Pages, API routes and server rendering in one project |
| Language | TypeScript | Typed config, metrics and report shapes shared by UI, API and CLI |
| Styling | Tailwind CSS with theme tokens (section 3.10) | Fast to build, one place for the burgundy palette |
| Charts | Recharts | React native, easy to theme with CSS variables |
| HTTP client (engine) | Built-in `node:http` / `node:https` | Full control over connections, no extra dependency |
| Live updates | Server-Sent Events from a Route Handler | One-way stream is all we need, no WebSocket server |
| Storage | JSON files in `reports/` | No database to install |
| CLI runner | `tsx` | Runs the TypeScript CLI and demo without a build step |
| Validation | `zod` | One schema for form, API and CLI input |

---

## 7. Folder structure

```
load-tester/
  package.json
  next.config.ts
  tsconfig.json
  FEATURES.md                  this file
  README.md                    setup and usage
  app/
    layout.tsx                 fonts, theme, nav
    globals.css                theme tokens (section 3.10)
    page.tsx                   new test + live view
    reports/
      page.tsx                 report history
      [id]/page.tsx            single report
    api/
      tests/route.ts           POST start
      tests/stop/route.ts      POST stop
      events/route.ts          GET SSE stream
      reports/route.ts         GET list
      reports/[id]/route.ts    GET one, DELETE
  components/                  TestForm, StageEditor, LiveStats, charts, tables
  lib/
    engine.ts                  virtual users, stages, metrics
    stats.ts                   latency histogram and percentiles
    runner.ts                  single running test on globalThis + event fan-out
    reports.ts                 save / list / read / delete
    schema.ts                  zod config schema
    types.ts                   shared types (Config, Tick, StageSummary, Report)
  hooks/
    useLiveTest.ts             EventSource hook for the live view
  cli/
    cli.ts                     command line runner
  demo/
    target.ts                  practice site, separate process on port 4000
  reports/                     saved results (git ignored)
```

---

## 8. Migration plan (current JS prototype to Next.js): completed 2026-10-03

The engine logic already works. Conversion moves it into TypeScript and replaces the hand-written server with Next.js.

| Step | Work | Keeps or replaces |
|------|------|-------------------|
| 1 | Create the Next.js app in this folder (TypeScript, Tailwind, App Router, ESLint) | New |
| 2 | Port `src/stats.js` and `src/engine.js` to `lib/stats.ts` and `lib/engine.ts`, add `lib/types.ts` and `lib/schema.ts` (zod) | Same logic, typed |
| 3 | Port `src/reports.js` to `lib/reports.ts` | Same logic |
| 4 | Write `lib/runner.ts`: holds the one running test on `globalThis`, keeps ticks for late joiners, fans events out to SSE clients | Replaces state in `src/server.js` |
| 5 | Write Route Handlers for tests, stop, events and reports | Replaces `src/server.js` |
| 6 | Theme tokens, layout, fonts | New |
| 7 | Build pages and components: form, stage editor, live stats, charts, stage table, verdict, history | New |
| 8 | Port CLI to `cli/cli.ts` and demo to `demo/target.ts`, run with `tsx` | Same behavior |
| 9 | Delete old `src/`, `public/` and root `node_modules` setup | Cleanup |
| 10 | README | New |
| 11 | Verify: `npm run build` passes, run a test from the dashboard and the CLI against the demo, check stop, refresh during a run, report pages, light and dark theme | Check |

Risks and how they are handled:

- **Hot reload in dev can create a second engine instance.** Fixed by keeping the runner on `globalThis`.
- **Next.js may cache or buffer API responses.** All API routes set `dynamic = 'force-dynamic'`, SSE sends `Cache-Control: no-cache` and a keep-alive ping.
- **Heavy load tests and the dashboard share one Node process.** Fine for local use up to a few thousand users. Beyond that, the CLI (separate process) is the better choice, or suggestion S12.

---

## 9. Open questions

1. Styling: Tailwind (recommended), plain CSS modules, or Tailwind + shadcn/ui components?
2. Charts: Recharts (recommended) or keep Chart.js?
3. Keep the CLI alongside the Next.js app?
4. Which suggested features (S1 to S20) go into v1?
5. Expected scale: hundreds or thousands of users?
