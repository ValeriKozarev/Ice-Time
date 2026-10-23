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

Worked out from the samples in `research/` on 2026-10-23 (full analysis in [research/schema-field-mapping.md](../research/schema-field-mapping.md), kept local and uncommitted). This is the starting point for the `Session` zod schema; the schema itself is still Val's to write.

| Field          | Required     | Why                                                | Notes                                                    |
| -------------- | ------------ | -------------------------------------------------- | -------------------------------------------------------- |
| `id`           | yes          | Dedupe and diff one week's run against the last    | Platform-prefixed, e.g. `finnly:5083188`                 |
| `rink`         | yes          | Filter and group by rink                           | Union of the five rink slugs, not the platform           |
| `surface`      | no           | Several rinks run more than one sheet at once      | Raw string: "South Rink", "SSSC Rink 2", "West Rink"     |
| `activity`     | yes          | The two categories we care about                   | `public-skate` or `stick-and-puck`                       |
| `rawTitle`     | yes          | The site's own wording, for display and debugging  | e.g. "Take A Shot"                                       |
| `start`, `end` | yes          | The whole point                                    | Local Denver time, no offset, e.g. `2026-10-23T06:00:00` |
| `sourceUrl`    | yes          | Where to tap to book                               | Best link per platform, below                            |
| `notes`        | no           | Finnly puts useful context here ("Birthday Party") | Free text                                                |
| `capacity`     | no (stretch) | Only Big Bear and DU expose it                     | `{ available, total }`                                   |

The scraper output also wants a small envelope: `scrapedAt` plus a per-rink `ok`/`failed` status, which powers the "as of" notice and lets the page say when a rink didn't load.

**Time zones:** every rink is local, so `start`/`end` stay as the offset-free wall-clock strings the sites give us, with no conversion. Two guardrails: set `TZ=America/Denver` wherever the scraper runs (Actions runners and containers default to UTC, which would skew "this week"), and don't turn the strings into `Date` objects in the scraper (JS reads offset-free timestamps as the machine's local time). Use string comparison or `Temporal.PlainDateTime` for date math.

### Extraction per platform

|                  | Big Bear (EZFacility)             | DU (WebTrac)                                                                               | Edge (CapturePoint)                                                 | SSPRD x2 (Finnly)                                                        |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Format           | JSON from the `FilterResults` XHR | HTML month calendar per section                                                            | HTML program detail page                                            | HTML with a JSON-parseable `_onlineScheduleList = [...]` in a script tag |
| Requests per run | 1 (if one range covers the week)  | 1 per section per month (4 stick and puck sections in the sample)                          | 1 per program per season                                            | 1 per rink; the sample covers ~8 months                                  |
| One session =    | array item                        | `a.calendar__block`                                                                        | `table.cat-table-schedule tbody tr`                                 | array item                                                               |
| `start`/`end`    | `start`, `end`                    | href `ARItemBeginDate` (MM/DD/YYYY) + `ARItemBeginTime`/`EndTime` (seconds since midnight) | cells `class-date` + `class-start-time`/`class-end-time` (12:00 PM) | `EventStartTime`, `EventEndTime`                                         |
| Activity label   | `title`                           | link text, or known from the primarycode fetched                                           | known from the program fetched                                      | `EventTypeName`                                                          |
| Surface          | `resourceName`                    | not shown                                                                                  | `class-location`                                                    | `FacilityName`                                                           |
| Source id        | `id`                              | none: FMID + date + begin time                                                             | none: program_id + date + start                                     | `EventId`                                                                |
| `sourceUrl`      | `/Sessions`                       | month calendar URL (never the add-to-cart href)                                            | `cat_program_list_detail.cfm?season_id=…&program_id=…`              | `/schedule/246` or `/247`                                                |
| Capacity         | `classSize - currentClassSize`    | text "14 of 30 Available"                                                                  | none without login                                                  | none                                                                     |

### Activity normalization

Match exact labels per adapter (a regex like `/skate/i` would catch Learn To Skate and Skate Rental), and log any label we haven't seen.

- **public-skate:** Public Skate (Big Bear, Finnly), Public Skate Sessions (Edge, program group 7929)
- **stick-and-puck:** Open Stick & Puck (Big Bear), Stick & Puck (DU; Edge program group 6487), Take A Shot (Finnly)
- **Undecided:** Silver Skates - Public Skate and Public Skate/Learn to Skate (Finnly); Family Stick & Puck (Big Bear)
- **Drop:** Skate Rental- Public Skate (Edge), Free Style, Learn To Skate, everything else

## Decisions

| Decision           | Choice                                                    | Why                                                                                                                                          |
| ------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Language           | TypeScript everywhere (Node scraper, React front end)     | One language and shared types end to end; Playwright is Node-native; .NET felt too heavy for this size of project                            |
| Architecture       | Option C: static pipeline, containerized from day one     | A scheduled scraper writes `sessions.json`, a static React page reads it; free to host, and it can grow into a K8s CronJob without a rewrite |
| Hosting            | GitHub Actions on a weekly schedule, page on GitHub Pages | No server to run or pay for                                                                                                                  |
| K8s practice       | Scraper as a CronJob on a local kind or k3d cluster       | Real Kubernetes experience without a cloud bill                                                                                              |
| Data model         | One shared `Session` zod schema and type                  | TS types vanish at runtime, so scraped data is validated at the boundary                                                                     |
| Adapters           | One per platform behind a common interface                | Five rinks share four platforms; adding a rink should be config, not code                                                                    |
| Scraping etiquette | Rare requests (weekly) with a clear User-Agent            | robots.txt isn't binding, but we want to be friendly to these sites and never cause them trouble                                             |

Options considered and set aside: Python (no edge over TS here, and off Val's interview stack), a .NET scraper, and a full API plus Postgres on a cloud cluster (cost and upkeep for one user).

## Plan

Four steps, each ending in a PR Val writes and Claude reviews.

1. [ ] **Recon, no code.** For each platform, use DevTools to find the request that returns sessions: URL, parameters (date range, facility ID), tokens or cookies, and whether it works logged out. Check for iCal or export feeds. Deliverable: notes per platform in `research.md`.
2. [ ] **Skeleton and first adapter.** Monorepo with `scraper`, `web`, and a shared package holding the `Session` schema. Big Bear adapter with Vitest tests against saved responses, and a CLI that writes `sessions.json`.
3. [ ] **Remaining adapters and the week view.** Three more adapters, activity-name normalization, a React/Vite week grid filterable by rink and activity, and a weekly GitHub Actions job that scrapes and deploys to Pages.
4. [ ] **Containers, K8s and email.** Dockerfile, manifests or a Helm chart running the scraper as a CronJob on kind, and a weekly email digest.

Stretch: filter sessions against Val's own schedule.

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
- [ ] Monorepo tooling: pnpm workspaces, npm workspaces, or Turborepo?
- [ ] Weekly email provider, decided at step 4
- [ ] Redact the live cookie values in the pasted curl in `research/du.md` before committing
- [ ] Big Bear: capture the `FilterResults` request (URL, method, body); can one call cover a full week?
- [ ] Edge: sample the Stick & Puck group (6487); are the time-specific Public Skate programs duplicates of the "Various Times" one?
- [ ] DU: does one calendar request without `CalendarFMID` show all sections?
- [ ] Finnly: what sets the window start (Oct 15 in the sample)?
- [ ] Include Silver Skates, Public Skate/Learn to Skate, and Family Stick & Puck?
- [ ] `research/` sits at the repo root, but this file and CLAUDE.md say `docs/research` (and link `research.md`); move the folder or fix the references
- [x] When do we add filtering against Val's own schedule? **Answer:** stretch goal toward the end.
