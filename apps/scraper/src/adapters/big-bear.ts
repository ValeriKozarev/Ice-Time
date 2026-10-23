import { z } from "zod";

import type { Activity, Session } from "@ice-time/shared";

const FILTER_URL =
  "https://bigbearicearena.ezfacility.com/Sessions/FilterResults";
const USER_AGENT =
  "ice-time-scraper (+https://github.com/ValeriKozarev/Ice-Time)";

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

export async function fetchBigBear(
  startDate: string,
  endDate: string,
): Promise<unknown> {
  // request body, we've determined this is the minimum set of params needed to get a response
  const body = new URLSearchParams({
    LocationId: "13558",
    Sunday: "true",
    Monday: "true",
    Tuesday: "true",
    Wednesday: "true",
    Thursday: "true",
    Friday: "true",
    Saturday: "true",
    StartTime: "12:00 AM",
    EndTime: "12:00 AM",
    "ReservationTypes[0].Selected": "true",
    "ReservationTypes[0].Id": "-1",
    "Resources[0].Selected": "true",
    "Resources[0].Id": "-1",
    StartDate: startDate,
    EndDate: endDate,
  });

  const res = await fetch(FILTER_URL, {
    method: "POST",
    headers: {
      "user-agent": USER_AGENT,
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  });

  // expecting a 2xx code, else we should report a failure
  if (!res.ok) {
    throw new Error(`Big Bear returned HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("json")) {
    throw new Error(
      `Big Bear returned ${contentType}, not JSON (probably its error page)`,
    );
  }

  // finally, our data
  return res.json();
}

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
