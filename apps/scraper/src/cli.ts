import { fetchBigBear, parseBigBear } from "./adapters/big-bear";
import { fetchFinnly, parseFinnly } from "./adapters/finnly";
import { upcomingWeek } from "./week-util";
import { ScrapeResult, Session } from "@ice-time/shared";
import { writeFileSync } from "node:fs";

import type { Rink, RinkStatus } from "@ice-time/shared";

const rinks: Record<Rink, RinkStatus> = {
  "big-bear": { status: "failed", error: "not run" },
  edge: { status: "failed", error: "adapter not written yet" },
  "joy-burns": { status: "failed", error: "adapter not written yet" },
  "south-sub": { status: "failed", error: "adapter not written yet" },
  "family-sports": { status: "failed", error: "adapter not written yet" },
};

type Adapter = { rink: Rink; scrape: () => Promise<Session[]> };

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Denver",
}).format(new Date());
const { start, end } = upcomingWeek(today);
// const start = "2026-10-26"
// const end = "2026-11-01"

const adapters: Adapter[] = [
  // this one accepts a date range so we compute it programmatically
  {
    rink: "big-bear",
    scrape: async () => parseBigBear(await fetchBigBear(start, end)),
  },
  // the finnly sites return months of data in one huge HTML response which we will trim later
  {
    rink: "south-sub",
    scrape: async () => parseFinnly(await fetchFinnly("south-sub"), "south-sub"),
  },
  {
    rink: "family-sports",
    scrape: async () => parseFinnly(await fetchFinnly("family-sports"), "family-sports"),
  },
];

const sessions: Session[] = [];

// helper which will run the corresponding scrape and parse flow for the given rink based on the mapping we've defined
async function runAdapter(rink: Rink, scrape: () => Promise<Session[]>) {
  try {
    const candidates = await scrape();

    for (const candidate of candidates) {
      // keep only next Mon-Sun (Finnly returns months of data)
      const day = candidate.startTime.slice(0, 10);
      if (day < start || day > end) continue;

      const result = Session.safeParse(candidate);

      if (result.success) {
        sessions.push(result.data);
      } else {
        console.warn(`skipping invalid ${rink} session`, candidate.id, result.error.issues);
      }
    }

    // mark this rink as a success
    rinks[rink] = { status: "ok" };
  }
  catch (error) { 
    // else we need to capture why this rink failed for us
    rinks[rink] = {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// this is the actual driver that will iterate over our rinks
for (const adapter of adapters) {
  console.log(`scraping ${adapter.rink}...`);
  await runAdapter(adapter.rink, adapter.scrape);
}

console.log("Session data captured, writing to file...");

const output = ScrapeResult.parse({
  scrapedAt: new Date().toISOString(),
  rinks,
  sessions,
});

const outFile = new URL("../../web/public/sessions.json", import.meta.url);
writeFileSync(outFile, JSON.stringify(output, null, 2));

console.log(`wrote ${sessions.length} sessions to ${outFile.pathname}`);
