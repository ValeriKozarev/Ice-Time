import { fetchBigBear, parseBigBear } from "./adapters/big-bear";

console.log("scraper is running, TZ = ", process.env.TZ);

// test data for now, this will be automated for weekly reporting
const weekStart = "2026-10-26";
const weekEnd = "2026-11-01";

const raw = await fetchBigBear(weekStart, weekEnd);
const candidates = parseBigBear(raw);

console.log(candidates);
