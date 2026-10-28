import { z } from "zod";

import type { Activity, Session } from "@ice-time/shared";

const USER_AGENT =
  "ice-time-scraper (+https://github.com/ValeriKozarev/Ice-Time)";

// these lookup maps will help us quickly parse down the received response
const ACTIVITIES: Record<string, Activity> = {
  "Public Skate": "public-skate",
  "Take A Shot": "stick-and-puck",
};

const FINNLY_RINKS = { "south-sub": 247, "family-sports": 246 } as const;
export type FinnlyRink = keyof typeof FINNLY_RINKS;

// shorthand for computing the two versions of the URL since we do this more than once
const scheduleUrl = (rink: FinnlyRink) => `https://ssprd.finnlyconnect.com/schedule/${FINNLY_RINKS[rink]}`;

// note: both South Sub and Family Sports rinks use the same Finnly platform, so we'll standardize once on what data we want to capture and use it in both places
const FinnlyItem = z.object({
  EventId: z.int(),
  FacilityName: z.string(),
  EventStartTime: z.string(),
  EventEndTime: z.string(),
  EventTypeName: z.string(),
  Description: z.string(),
});
const FinnlyResponse = z.array(FinnlyItem);

export async function fetchFinnly(rink: FinnlyRink): Promise<unknown> {
  const url = scheduleUrl(rink);
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });

  // check for success
  if (!res.ok) {
    throw new Error(`Finnly (${rink}) returned HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  // then check for structure
  if (!contentType.includes("text/html")) { 
    throw new Error(`Finnly (${rink}) returned ${contentType}, not HTML`);
  }

  // finally we have one chance to read the body from the response
  const html = await res.text();
  return stripFinnlyHtml(html);
}

export function stripFinnlyHtml(rawHTML: string): unknown {
  const startMarker = "_onlineScheduleList = ";
  const startMarkerAt = rawHTML.indexOf(startMarker);
  if (startMarkerAt === -1) {
    throw new Error("Finnly page has no _onlineScheduleList (layout changed?)");
  }

  const start = startMarkerAt + startMarker.length; // first char after "= ", i.e. the [

  const endMarker = "];";
  const endMarkerAt = rawHTML.indexOf(endMarker, start);
  if (endMarkerAt === -1) {
    throw new Error(
      "Finnly page _onlineScheduleList has no ending ]; (layout changed?)",
    );
  }

  return JSON.parse(rawHTML.slice(start, endMarkerAt + 1));
}

export function parseFinnly(jsonData: unknown, rink: FinnlyRink): Session[] {
  const items = FinnlyResponse.parse(jsonData);

  return items.flatMap((item): Session[] => {
    const activity = ACTIVITIES[item.EventTypeName];
    if (!activity) return []; // drop anything that isn't open skate or stick and puck

    return [
      {
        id: "finnly:" + String(item.EventId),
        rink,
        activity,
        rawTitle: item.EventTypeName,
        startTime: item.EventStartTime,
        endTime: item.EventEndTime,
        sourceUrl: scheduleUrl(rink),
        surface: item.FacilityName,
        notes: item.Description,
      },
    ];
  });
}
