# Ice Time

Finds Public Skate and Stick and Puck sessions across five Denver-metro ice rinks and shows the whole week on one phone-friendly page.

A scraper runs once a week, normalizes each rink's schedule into a shared `Session` shape, and writes `sessions.json`. A static React page reads that file. No server, no database.

**Status:** early. The monorepo is scaffolded; the first rink adapter (Big Bear) is next. See [docs/plan.md](docs/plan.md) for the plan and decisions.

## Stack

TypeScript everywhere, in a pnpm workspace:

| Package | What it is |
| --- | --- |
| `apps/scraper` | Node CLI that fetches rink schedules and writes `sessions.json` (run with tsx) |
| `apps/web` | React + Vite page that displays the week |
| `packages/shared` | The `Session` zod schema and types, used by both apps |

Tooling: TypeScript 7, Vitest, Oxlint, Prettier.

## Getting started

Requires Node 24 (see `.nvmrc`) and pnpm.

```sh
pnpm install
```

| Command | Does |
| --- | --- |
| `pnpm test` | Run all tests (watch mode locally) |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | Lint with Oxlint |
| `pnpm format` | Format with Prettier |
| `pnpm --filter @ice-time/web dev` | Start the web app locally |
| `pnpm --filter @ice-time/scraper scrape` | Run the scraper |

## Scraping etiquette

The scraper makes as few requests as possible: once per rink, per week, with a clear User-Agent. These are small local businesses and we never want to cause them trouble.

## License

GPL-3.0. See [LICENSE](LICENSE).
