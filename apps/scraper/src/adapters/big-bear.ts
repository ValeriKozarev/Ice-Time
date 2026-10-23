import { z } from "zod";

import type { Activity, Session } from "@ice-time/shared";

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

const ACTIVITIES: Record<string, Activity> = {
  "Public Skate": "public-skate",
  "Open Stick & Puck": "stick-and-puck",
};

// this adapter is responsible for parsing out the data we scrape from Big Bear, see test/fixtures for sample data from each rink
export function parseBigBear(raw: unknown): Session[] {
  // top-level response parsing
  const items = BigBearResponse.parse(raw);

  // then try to map it to our shape
  return items.flatMap((item): Session[] => {
    const activity = ACTIVITIES[item.title];
    if (!activity) return []; // drop anything that isn't open skate or stick and puck

    return [
      {
        id: `ezfacility:${item.id}`,
        rink: "big-bear",
        activity,
        rawTitle: item.title,
        startTime: item.start.slice(0, 19),
        endTime: item.end.slice(0, 19),
        sourceUrl: "https://bigbearicearena.ezfacility.com/Sessions",
        capacity: {
          total: item.classSize,
          available: item.classSize - item.currentClassSize,
        },
        surface: item.resourceName,
      },
    ];
  });
}
