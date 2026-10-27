import { describe, it, expect } from "vitest";
import { upcomingWeek } from "./week-util";

describe("Week Utils", () => {
  it.each([
    ["2026-10-24", "2026-10-26", "2026-11-01"], // Saturday
    ["2026-10-25", "2026-10-26", "2026-11-01"], // Sunday
    ["2026-10-26", "2026-11-02", "2026-11-08"], // Monday → skips to next week
    ["2026-10-31", "2026-11-02", "2026-11-08"], // month boundary (and DST weekend)
    ["2026-12-31", "2027-01-04", "2027-01-10"], // year boundary
  ])("from %s the week is %s to %s", (today, start, end) => {
    expect(upcomingWeek(today)).toEqual({ start, end });
  });
});
