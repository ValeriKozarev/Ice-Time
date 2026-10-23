import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseBigBear } from "./big-bear";
import { Session } from "@ice-time/shared";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../test/fixtures/bigbear-2026-10-23.json", import.meta.url),
    "utf8",
  ),
);

describe("Big Bear Adapter", () => {
  it("Every output passes Session.safeParse", () => {
    // doing it this way will help us track down problems faster
    const failures = parseBigBear(fixture)
      .map((s) => ({ id: s.id, result: Session.safeParse(s) }))
      .filter((r) => !r.result.success);

    expect(failures).toEqual([]);
  })

  it("Correctly keeps only Public Skate and Stick and Puck activities from the data response (57 of 86)", () => {
    expect(parseBigBear(fixture)).toHaveLength(57);
  });

  it("Correctly parses a single item from the data response", () => {
    const expectedSession = {
      id: "ezfacility:217287181",
      rink: "big-bear",
      activity: "stick-and-puck",
      rawTitle: "Open Stick & Puck",
      startTime: "2026-10-23T06:00:00",
      endTime: "2026-10-23T07:15:00",
      sourceUrl: "https://bigbearicearena.ezfacility.com/Sessions",
      capacity: { total: 30, available: 25 },
      surface: "North Rink",
    } satisfies Session;

    expect(
      parseBigBear(fixture).find((s) => s.id === "ezfacility:217287181"),
    ).toEqual(expectedSession);
  });
});
