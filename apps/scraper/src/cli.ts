import { fetchBigBear, parseBigBear } from "./adapters/big-bear";
import { ScrapeResult, Session } from "@ice-time/shared";
import { writeFileSync } from "node:fs";

import type { Rink, RinkStatus } from "@ice-time/shared";

console.log("scraper is running, TZ = ", process.env.TZ);

const rinks: Record<Rink, RinkStatus> = {
  "big-bear": { status: "failed", error: "not run" },
  edge: { status: "failed", error: "adapter not written yet" },
  "joy-burns": { status: "failed", error: "adapter not written yet" },
  "south-sub": { status: "failed", error: "adapter not written yet" },
  "family-sports": { status: "failed", error: "adapter not written yet" },
};

// test data for now, this will be automated for weekly reporting
const weekStart = "2026-10-26";
const weekEnd = "2026-11-01";

const sessions: Session[] = [];

try {
  // just focusing on Big Bear to start
  const candidates = parseBigBear(await fetchBigBear(weekStart, weekEnd));

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
