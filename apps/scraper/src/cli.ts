import { fetchBigBear, parseBigBear } from "./adapters/big-bear";
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

console.log("scraper is running, TZ = ", process.env.TZ);

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Denver",
}).format(new Date());
const { start, end } = upcomingWeek(today);

const sessions: Session[] = [];

try {
  // just focusing on Big Bear to start
  const candidates = parseBigBear(await fetchBigBear(start, end));

  for (const candidate of candidates) {
    const result = Session.safeParse(candidate);

    if (result.success) {
      sessions.push(result.data);
    } else {
      console.warn(
        "skipping invalid big-bear session",
        candidate.id,
        result.error.issues,
      );
    }
  }

  rinks["big-bear"] = { status: "ok" };
} catch (error) {
  rinks["big-bear"] = {
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  };
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
