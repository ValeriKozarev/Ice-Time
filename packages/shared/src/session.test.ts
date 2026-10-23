import { describe, it, expect } from "vitest";
import { Activity, LocalDateTime, Rink, RinkStatus, ScrapeResult, Session } from "./session";

const validSession = {
  id: "finnly:12345",
  rink: "big-bear",
  activity: "public-skate",
  rawTitle: "Public Skate",
  startTime: "2026-10-23T06:00:00",
  endTime: "2026-10-23T07:00:00",
  sourceUrl: "https://bigbearicearena.ezfacility.com/Sessions",
} satisfies Session;

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

  it("accepts additional optional fields", () => {
    const validSessionWithOptionalFields = {
      ...validSession,
      surface: "Sheet A",
      notes: "Some extra info about the session",
      capacity: {
        available: 10,
        total: 20,
      },
    };
    expect(() => Session.parse(validSessionWithOptionalFields)).not.toThrow();
  });

  it("rejects invalid capacity fields", () => {
    const validSessionWithInvalidOptionalFields = {
      ...validSession,
      capacity: {
        available: -5,
        total: 20,
      },
    };
    expect(() =>
      Session.parse(validSessionWithInvalidOptionalFields),
    ).toThrow();
  });

  it("rejects availability being higher than capacity", () => {
    const validSessionWithInvalidOptionalFields = {
      ...validSession,
      capacity: {
        available: 20,
        total: 5,
      },
    };
    expect(() =>
      Session.parse(validSessionWithInvalidOptionalFields),
    ).toThrow();
  });

  it("rejects startTime being after endTime", () => {
    const validSessionWithInvalidTimes = {
      ...validSession,
      startTime: "2026-10-23T07:00:00",
      endTime: "2026-10-23T06:00:00",
    };
    expect(() => Session.parse(validSessionWithInvalidTimes)).toThrow();
  });

  it("rejects startTime being the same as endTime", () => {
    const validSessionWithInvalidTimes = {
      ...validSession,
      startTime: "2026-10-23T07:00:00",
      endTime: "2026-10-23T07:00:00",
    };
    expect(() => Session.parse(validSessionWithInvalidTimes)).toThrow();
  });
});

describe("RinkStatus", () => {
  it("accepts a valid 'ok' status", () => {
    expect(() => RinkStatus.parse({ status: "ok" })).not.toThrow();
  });

  it("accepts a valid 'failed' status with an error message", () => {
    expect(() =>
      RinkStatus.parse({ status: "failed", error: "An error occurred" }),
    ).not.toThrow();
  });

  it("rejects an invalid 'failed' status", () => {
    expect(() => RinkStatus.parse({ status: "failed" })).toThrow();
  });
});

describe("ScrapeResult", () => {
  const allOk = {
    "big-bear": { status: "ok" },
    edge: { status: "ok" },
    "family-sports": { status: "ok" },
    "south-sub": { status: "ok" },
    "joy-burns": { status: "ok" },
  } satisfies ScrapeResult["rinks"];

  const validResult = {
    scrapedAt: "2026-10-26T13:00:00.000Z",
    rinks: allOk,
    sessions: [validSession],
  } satisfies ScrapeResult;

  it("accepts a valid result", () => {
    expect(ScrapeResult.parse(validResult)).toEqual(validResult);
  });

  it("accepts a week where one rink failed", () => {
    const result = {
      ...validResult,
      rinks: { ...allOk, edge: { status: "failed", error: "HTTP 503" } },
    };
    expect(() => ScrapeResult.parse(result)).not.toThrow();
  });

  it("rejects a result that leaves out a rink", () => {
    const withoutEdge = Object.fromEntries(
      Object.entries(allOk).filter(([rink]) => rink !== "edge"),
    );
    const result = ScrapeResult.safeParse({ ...validResult, rinks: withoutEdge });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["rinks", "edge"]);
  });

  it("rejects an unknown rink", () => {
    const rinks = { ...allOk, "big-baer": { status: "ok" } };
    expect(() => ScrapeResult.parse({ ...validResult, rinks })).toThrow();
  });

  it("rejects a local scrapedAt (it must be a UTC instant)", () => {
    const result = { ...validResult, scrapedAt: "2026-10-26T06:00:00" };
    expect(() => ScrapeResult.parse(result)).toThrow();
  });
});