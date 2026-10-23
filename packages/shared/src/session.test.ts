import { describe, it, expect } from "vitest";
import { Activity, LocalDateTime, Rink, Session } from "./session";

describe("Activity", () => {
  it("accepts a known activity", () => {
    expect(Activity.parse("public-skate")).toBe("public-skate");
  });

  it("rejects the site's raw wording", () => {
    expect(() => Activity.parse("Public Skate")).toThrow();
  });
});

describe("Rink", () => {
  it.each(["big-bear", "edge", "family-sports", "south-sub", "joy-burns"])(
    "accepts %s",
    (slug) => {
      expect(Rink.parse(slug)).toBe(slug);
    },
  );

  it("rejects the site's raw wording", () => {
    expect(() => Rink.parse("Big Bear")).toThrow();
  });
});

describe("LocalDateTime", () => {
  it("accepts a valid local date-time string", () => {
    expect(() => LocalDateTime.parse("2026-10-23T06:00:00")).not.toThrow();
  });

  it("rejects a platform-specific format (Big Bear is too specific)", () => {
    expect(() => LocalDateTime.parse("2026-10-23T06:00:00.0000000")).toThrow();
  });

  it("rejects a platform-specific format (no seconds)", () => {
    expect(() => LocalDateTime.parse("2026-10-23T06:00")).toThrow();
  });

  it("rejects any offset format (offset)", () => {
    expect(() => LocalDateTime.parse("2026-10-23T06:00:00Z")).toThrow();
    expect(() => LocalDateTime.parse("2026-10-23T06:00:00-06:00")).toThrow();
  });

  it("rejects an invalid date", () => {
    expect(() => LocalDateTime.parse("2026-02-30T06:00:00")).toThrow();
  });
});

describe("Session", () => {
  const validSession = {
    id: "finnly:12345",
    rink: "big-bear",
    activity: "public-skate",
    rawTitle: "Public Skate",
    startTime: "2026-10-23T06:00:00",
    endTime: "2026-10-23T07:00:00",
    sourceUrl: "https://bigbearicearena.ezfacility.com/Sessions",
  } satisfies Session;

  it("accepts a valid session", () => {
    expect(() => Session.parse(validSession)).not.toThrow();
  });

  it("rejects a session with an invalid rink", () => {
    const invalidSession = { ...validSession, rink: "invalid-rink" };
    expect(() => Session.parse(invalidSession)).toThrow();
  });

  it("rejects a session with an invalid activity", () => {
    const invalidSession = {
      ...validSession,
      activity: "invalid-activity",
    };
    expect(() => Session.parse(invalidSession)).toThrow();
  });

  it("rejects a session with an invalid URL", () => {
    const invalidSession = { ...validSession, sourceUrl: "/Sessions" };
    expect(() => Session.parse(invalidSession)).toThrow();
  });
});
