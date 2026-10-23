# Ice Time: plan

This is the living charter for the project: the goal, decisions, next steps and open questions. Seeded from the project charter doc made by Val and Claude this file is now the source of truth.

## Goal

A phone-friendly page, and later a weekly email, showing every Public Skate and Stick and Puck session for the week across five Denver-metro rinks. It is also a portfolio piece: Val builds it to sharpen modern TypeScript, React and Kubernetes skills ahead of a job change.

- **Activities:** Public Skate (also called Open Skate) and Stick and Puck (also called Take a Shot)
- **First output:** a whole-week view of all options; filtering against Val's own schedule is a stretch goal for the end

## Rinks and data sources

Five rinks sit on four booking platforms, so the scraper needs four adapters, not five. Details per platform live in [research.md](./research.md).

| Rink                 | Platform                | Schedule link                                                                                                                                                                                                                                                     | Notes                                                                                                                       |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Big Bear             | EZFacility              | [Sessions](https://bigbearicearena.ezfacility.com/Sessions)                                                                                                                                                                                                       | Rows fill in via JavaScript, so likely a JSON request behind it                                                             |
| DU Joy Burns         | Vermont Systems WebTrac | [Stick and puck](https://codenveruniversityweb.myvscloud.com/webtrac/web/search.html?module=AR&primarycode=354208), [Public skate](https://codenveruniversityweb.myvscloud.com/webtrac/web/search.html?module=AR&primarycode=354210&InterfaceParameter=WebTrac_1) | robots.txt disallows bots; watch for session-only `_csrf_token` params                                                      |
| Edge Ice Arena       | CapturePoint            | [Drop-in programs](https://register.capturepoint.com/reg/cat_program_list.cfm?season_id=14132&program_group_id=6485)                                                                                                                                              | robots.txt disallows bots; `season_id` changes each season; also an [online calendar](https://www.ifoothills.org/cal-edge/) |
| South Suburban       | Finnly Connect          | [Schedule 247](https://ssprd.finnlyconnect.com/schedule/247)                                                                                                                                                                                                      | robots.txt disallows bots; same site as Family Sports                                                                       |
| Family Sports Center | Finnly Connect          | [Schedule 246](https://ssprd.finnlyconnect.com/schedule/246)                                                                                                                                                                                                      | Same adapter as South Suburban                                                                                              |

## Session schema and field mappings

Worked out from the samples in `research/` on 2026-10-23 (full analysis in [research/schema-field-mapping.md](../research/schema-field-mapping.md), kept local and uncommitted). The schema is implemented in [`packages/shared/src/session.ts`](../packages/shared/src/session.ts) (PR #2).

| Field                  | Required     | Why                                                | Notes                                                                           |
| ---------------------- | ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `id`                   | yes          | Dedupe and diff one week's run against the last    | `<platform>:<source id>`: `ezfacility:`, `webtrac:`, `capturepoint:`, `finnly:` |
| `rink`                 | yes          | Filter and group by rink                           | `big-bear`, `joy-burns`, `edge`, `south-sub`, `family-sports`                   |
| `surface`              | no           | Several rinks run more than one sheet at once      | Raw string: "South Rink", "SSSC Rink 2", "West Rink"                            |
| `activity`             | yes          | The two categories we care about                   | `public-skate` or `stick-and-puck`                                              |
| `rawTitle`             | yes          | The site's own wording, for display and debugging  | e.g. "Take A Shot"                                                              |
| `startTime`, `endTime` | yes          | The whole point                                    | Local Denver time, no offset, e.g. `2026-10-23T06:00:00`                        |
| `sourceUrl`            | yes          | Where to tap to book                               | Best link per platform, below                                                   |
| `notes`                | no           | Finnly puts useful context here ("Birthday Party") | Free text                                                                       |
| `capacity`             | no (stretch) | Only Big Bear and DU expose it                     | `{ available, total }`, whole numbers                                           |

The scraper output is a `ScrapeResult` envelope: `scrapedAt`, a `rinks` record with an `ok` or `failed` (+ `error`) status for every rink, and the `sessions` array. That powers the "as of" notice and lets the page say when a rink didn't load.

**Validation rules** (each has a test in `session.test.ts`):

- `startTime`/`endTime` use one canonical form, `YYYY-MM-DDTHH:mm:ss`: no fractional seconds, no `Z`, no offset, and the date must exist. Adapters normalize to this (Big Bear's `.0000000` suffix gets trimmed), which is what makes string comparison safe.
- `endTime` must be after `startTime`; `capacity.available` must be at most `capacity.total`.
- `sourceUrl` must be an absolute `http(s)` URL (`z.httpUrl()`), so a relative `/Sessions` is rejected.
- Every object is strict: unknown keys are rejected, so a misspelled optional field fails loudly instead of vanishing.
- `rinks` must contain exactly the five rink slugs; `scrapedAt` is a UTC instant (`new Date().toISOString()`), unlike session times.

**Time zones:** every rink is local, so `startTime`/`endTime` stay as the offset-free wall-clock strings the sites give us, with no conversion. Two guardrails: set `TZ=America/Denver` wherever the scraper runs (Actions runners and containers default to UTC, which would skew "this week"), and don't turn the strings into `Date` objects in the scraper (JS reads offset-free timestamps as the machine's local time). Use string comparison or `Temporal.PlainDateTime` for date math.

### Extraction per platform

|                       | Big Bear (EZFacility)             | DU (WebTrac)                                                                               | Edge (CapturePoint)                                                 | SSPRD x2 (Finnly)                                                        |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Format                | JSON from the `FilterResults` XHR | HTML month calendar per section                                                            | HTML program detail page                                            | HTML with a JSON-parseable `_onlineScheduleList = [...]` in a script tag |
| Requests per run      | 1 form POST per week, no cookies  | 1 per section per month (4 stick and puck sections in the sample)                          | 1 per program per season                                            | 1 per rink; the sample covers ~8 months                                  |
| One session =         | array item                        | `a.calendar__block`                                                                        | `table.cat-table-schedule tbody tr`                                 | array item                                                               |
| `startTime`/`endTime` | `start`, `end`                    | href `ARItemBeginDate` (MM/DD/YYYY) + `ARItemBeginTime`/`EndTime` (seconds since midnight) | cells `class-date` + `class-start-time`/`class-end-time` (12:00 PM) | `EventStartTime`, `EventEndTime`                                         |
| Activity label        | `title`                           | link text, or known from the primarycode fetched                                           | known from the program fetched                                      | `EventTypeName`                                                          |
| Surface               | `resourceName`                    | not shown                                                                                  | `class-location`                                                    | `FacilityName`                                                           |
| Source id             | `id`                              | none: FMID + date + begin time                                                             | none: program_id + date + start                                     | `EventId`                                                                |
| `sourceUrl`           | `/Sessions`                       | month calendar URL (never the add-to-cart href)                                            | `cat_program_list_detail.cfm?season_id=…&program_id=…`              | `/schedule/246` or `/247`                                                |
| Capacity              | `classSize - currentClassSize`    | text "14 of 30 Available"                                                                  | none without login                                                  | none                                                                     |

### Activity normalization

Match exact labels per adapter (a regex like `/skate/i` would catch Learn To Skate and Skate Rental), and log any label we haven't seen.

- **public-skate:** Public Skate (Big Bear, Finnly), Public Skate Sessions (Edge, program group 7929)
- **stick-and-puck:** Open Stick & Puck (Big Bear), Stick & Puck (DU; Edge program group 6487), Take A Shot (Finnly)
- **Undecided:** Silver Skates - Public Skate and Public Skate/Learn to Skate (Finnly); Family Stick & Puck (Big Bear)
- **Drop:** Skate Rental- Public Skate (Edge), Free Style, Learn To Skate, everything else

## Decisions

| Decision           | Choice                                                                                                                          | Why                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language           | TypeScript everywhere (Node scraper, React front end)                                                                           | One language and shared types end to end; Playwright is Node-native; .NET felt too heavy for this size of project                                              |
| Architecture       | Option C: static pipeline, containerized from day one                                                                           | A scheduled scraper writes `sessions.json`, a static React page reads it; free to host, and it can grow into a K8s CronJob without a rewrite                   |
| Hosting            | GitHub Actions on a weekly schedule, page on GitHub Pages                                                                       | No server to run or pay for                                                                                                                                    |
| K8s practice       | Scraper as a CronJob on a local kind or k3d cluster                                                                             | Real Kubernetes experience without a cloud bill                                                                                                                |
| Data model         | One shared `Session` zod schema and type                                                                                        | TS types vanish at runtime, so scraped data is validated at the boundary                                                                                       |
| Monorepo tooling   | pnpm workspaces, no Turborepo; shared package is source-only                                                                    | Small repo; no build step for `packages/shared`                                                                                                                |
| Time values        | Session times as local wall-clock strings; `scrapedAt` as a UTC instant                                                         | Rink times mean "local time" by definition; `Date` would shift them on a UTC runner. Date math via `Temporal.PlainDateTime` (polyfill, since Node 24 lacks it) |
| Schema strictness  | `z.strictObject` everywhere                                                                                                     | We produce this data ourselves, so an unexpected key is a bug to surface, not ignore                                                                           |
| Adapters           | One per platform behind a common interface                                                                                      | Five rinks share four platforms; adding a rink should be config, not code                                                                                      |
| Scrape timing      | Sunday evening (Denver), for the upcoming Mon to Sun                                                                            | Big Bear only returns sessions that haven't started yet, so a Monday run could miss Monday's early sessions                                                    |
| Session validation | Per row, in the CLI: `Session.safeParse` each adapter output, skip and log bad rows, then `ScrapeResult.parse` the whole result | Adapters stay pure mappings; one bad row never hides a rink's whole week                                                                                       |
| Scraping etiquette | Rare requests (weekly) with a clear User-Agent                                                                                  | robots.txt isn't binding, but we want to be friendly to these sites and never cause them trouble                                                               |

Options considered and set aside: Python (no edge over TS here, and off Val's interview stack), a .NET scraper, and a full API plus Postgres on a cloud cluster (cost and upkeep for one user).

## Plan

Four steps, each ending in a PR Val writes and Claude reviews.

1. [x] **Recon, no code.** For each platform, use DevTools to find the request that returns sessions: URL, parameters (date range, facility ID), tokens or cookies, and whether it works logged out. Check for iCal or export feeds. Deliverable: notes per platform in `research.md`.
2. [ ] **Skeleton and first adapter.** Monorepo with `scraper`, `web`, and a shared package holding the `Session` schema. Big Bear adapter with Vitest tests against saved responses, and a CLI that writes `sessions.json`.
   - [x] Monorepo scaffold (PR #1)
   - [x] Shared schema: `Session`, `RinkStatus`, `ScrapeResult` with tests (PR #2)
   - [ ] Big Bear adapter and CLI (see Next up). In progress on branch `big-bear-adapter`: `parseBigBear` and its fixture tests are done
3. [ ] **Remaining adapters and the week view.** Three more adapters, activity-name normalization, a React/Vite week grid filterable by rink and activity, and a weekly GitHub Actions job that scrapes and deploys to Pages.
4. [ ] **Containers, K8s and email.** Dockerfile, manifests or a Helm chart running the scraper as a CronJob on kind, and a weekly email digest.

Stretch: filter sessions against Val's own schedule.

## Next up

The Big Bear adapter and the CLI, in small PRs:

1. [x] **Capture Big Bear's `FilterResults` request** and save a fixture. Request recon is in `research/bigbear.md`; fixture at `apps/scraper/test/fixtures/bigbear-2026-10-23.json`.
2. [x] **Adapter shape:** split `fetch` (network) from `parse` (pure, tested against the fixture). The shared adapter interface is deferred until a second adapter exists, so it's designed from two real examples rather than one.
3. [x] **Big Bear `parse` + tests:** raw-response schema (plain `z.object`, only the fields used), exact-label activity map, `flatMap` to drop other activities, `.slice(0, 19)` for times, `ezfacility:` id, surface and capacity. Tests: 57 of 86 kept, one item mapped exactly, every output passes `Session.safeParse`. Still to do: log labels we haven't seen.
4. [ ] **Big Bear `fetch`:** built-in `fetch`, a clear User-Agent, the minimal form body from `research/bigbear.md` built with `URLSearchParams`, and the upcoming Mon to Sun dates. Check `content-type` is JSON, since failures arrive as a redirect to an HTML error page.
5. [ ] **CLI:** compute next Mon to Sun in Denver time, run adapters, catch per-rink failures into `RinkStatus`, `Session.safeParse` each row (skip and log bad ones), build and `ScrapeResult.parse` the result, write `apps/web/public/sessions.json` (gitignored). Runs with `TZ=America/Denver`.

## How we work together

Val writes the code; Claude mentors and reviews. The aim is that Val can explain every design decision, not just ship features.

**Val**

- Writes all production code, tests and config
- Opens a PR per step, or smaller, and asks for review
- Pushes back when an explanation doesn't land, or a suggestion doesn't fit

**Claude**

- Explains concepts, trade-offs and why things work, before or alongside any example
- Gives hints and small illustrative snippets, not finished features; asks before writing anything larger
- Reviews PRs like a senior teammate: correctness first, then design, testing and idiom, with the reasoning behind each comment
- Points out talking points and interesting tech bit of knowledge as they come up
- Never pushes to Val's branches or merges without being asked

## Open questions

- [x] robots.txt stance for WebTrac, CapturePoint and Finnly. **Answer:** rare requests to start; be friendly to these sites and avoid causing them any trouble.
- [x] Do any platforms need a login or session token to list sessions? **Answer:** all schedules appear to be publicly available (confirm during recon).
- [x] Monorepo tooling: pnpm workspaces, npm workspaces, or Turborepo? **Answer:** pnpm workspaces (PR #1).
- [ ] Weekly email provider, decided at step 4
- [ ] Redact the live cookie values in the pasted curl in `research/du.md` before committing
- [x] Big Bear: capture the `FilterResults` request (URL, method, body); can one call cover a full week? **Answer:** form POST, no cookies, one call per week, future sessions only; see `research/bigbear.md`.
- [ ] Edge: sample the Stick & Puck group (6487); are the time-specific Public Skate programs duplicates of the "Various Times" one?
- [ ] DU: does one calendar request without `CalendarFMID` show all sections?
- [ ] Finnly: what sets the window start (Oct 15 in the sample)?
- [ ] Include Silver Skates, Public Skate/Learn to Skate, and Family Stick & Puck?
- [ ] `research/` sits at the repo root, but this file and CLAUDE.md say `docs/research` (and link `research.md`); move the folder or fix the references
- [x] When do we add filtering against Val's own schedule? **Answer:** stretch goal toward the end.
- [ ] Report skipped rows? Maybe `{ status: "ok", skipped: n }` in `RinkStatus` once a real scrape actually skips something.
- [ ] Tighten `id` validation (non-empty, `<platform>:` prefix)? Decide in the Big Bear adapter PR.
- [ ] Which `Temporal` polyfill for the week view? Node 24 has no global `Temporal`.
- [ ] Are Finnly `EventId`s unique across both SSPRD rinks? Check against the two samples when writing the Finnly adapter.
