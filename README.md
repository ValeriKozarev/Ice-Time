# Ice Time

Finds Public Skate and Stick and Puck sessions across five Denver-metro ice rinks and shows the whole week on one phone-friendly page.

A scraper runs once a week, normalizes each rink's schedule into a shared `Session` shape, and writes `sessions.json`. A static React page reads that file. No server, no database.

**Status:** early. The monorepo is scaffolded and the shared data schema is done (`packages/shared/src/session.ts`). Next up is the first rink adapter (Big Bear) and the scraper CLI. See [docs/plan.md](docs/plan.md) for the plan, decisions and next steps.

## Stack

TypeScript everywhere, in a pnpm workspace:

| Package           | What it is                                                                       |
| ----------------- | -------------------------------------------------------------------------------- |
| `apps/scraper`    | Node CLI that fetches rink schedules and writes `sessions.json` (run with tsx)   |
| `apps/web`        | React + Vite page that displays the week                                         |
| `packages/shared` | zod schemas and types used by both apps: `Session`, `RinkStatus`, `ScrapeResult` |

Tooling: TypeScript 7, Vitest, Oxlint, Prettier.

## Getting started

Requires Node 24 (see `.nvmrc`) and pnpm.

```sh
pnpm install
```

| Command                                  | Does                               |
| ---------------------------------------- | ---------------------------------- |
| `pnpm test`                              | Run all tests (watch mode locally) |
| `pnpm typecheck`                         | Type-check every package           |
| `pnpm lint`                              | Lint with Oxlint                   |
| `pnpm format`                            | Format with Prettier               |
| `pnpm --filter @ice-time/web dev`        | Start the web app locally          |
| `pnpm --filter @ice-time/scraper scrape` | Run the scraper                    |

## Data shape

The scraper writes one `sessions.json` per week, validated against `ScrapeResult` before it is written and again when the page loads it:

```json
{
  "scrapedAt": "2026-10-26T13:00:00.000Z",
  "rinks": {
    "big-bear": { "status": "ok" },
    "edge": { "status": "failed", "error": "HTTP 503" }
  },
  "sessions": [
    {
      "id": "finnly:5083188",
      "rink": "south-sub",
      "activity": "stick-and-puck",
      "rawTitle": "Take A Shot",
      "startTime": "2026-10-23T06:00:00",
      "endTime": "2026-10-23T07:15:00",
      "sourceUrl": "https://ssprd.finnlyconnect.com/schedule/247"
    }
  ]
}
```

`rinks` always lists all five rinks (trimmed above). Session times are local Denver wall-clock time with no offset; `scrapedAt` is a UTC instant. See [docs/plan.md](docs/plan.md#session-schema-and-field-mappings) for the full rules.

## Scraping etiquette

The scraper makes as few requests as possible: once per rink, per week, with a clear User-Agent. These are small local businesses and we never want to cause them trouble.

## License

GPL-3.0. See [LICENSE](LICENSE).
