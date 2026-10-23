import { z } from "zod";
import { Session } from "@ice-time/shared";

const BigBearItem = z.object({
  id: z.string(),
  title: z.string(),
  classSize: z.int(), // this is the total capacity
  currentClassSize: z.int(), // this will be used for classSize - currentClassSize to get available spots
  start: z.string(),
  end: z.string(),
  resourceName: z.string(), // this is the surface within the rink, e.g. "South Rink"
});

const BigBearResponse = z.array(BigBearItem);

// this adapter is responsible for parsing out the data we scrape from Big Bear, see test/fixtures for sample data from each rink
export function parseBigBear(raw: unknown): Session[] {
  return [];
}
