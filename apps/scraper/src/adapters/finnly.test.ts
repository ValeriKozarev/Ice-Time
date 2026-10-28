import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fetchFinnly, stripFinnlyHtml, parseFinnly } from "./finnly";
import { Session } from "@ice-time/shared";

const southSubFixture = readFileSync(
  new URL(
    "../../test/fixtures/finnly-south-sub-2026-10-23.txt",
    import.meta.url,
  ),
  "utf8",
);
const familySportsFixture = readFileSync(
  new URL(
    "../../test/fixtures/finnly-family-sports-2026-10-23.txt",
    import.meta.url,
  ),
  "utf8",
);

describe("Finnly Adapter, HTML stripping ", () => {
  it("We throw when starting marker is missing when stripping HTML response", () => {
    expect(() => stripFinnlyHtml("_facilityList = [];")).toThrow(
      "no _onlineScheduleList",
    );
  });

  it("We throw when ending marker is missing when stripping HTML response", () => {
    expect(() =>
      stripFinnlyHtml('_onlineScheduleList = [{"EventId":1}'),
    ).toThrow("no ending");
  });

  it("Successfully parses HTML response to JSON (32 objects in South Sub fixture)", () => {
    const data = stripFinnlyHtml(southSubFixture);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(32);
  });
});

describe("Finnly Adapter, South Sub (parse)", () => {
  it("Every output passes Session.safeParse", () => {
    // doing it this way will help us track down problems faster
    const failures = parseFinnly(stripFinnlyHtml(southSubFixture), "south-sub")
      .map((s) => ({ id: s.id, result: Session.safeParse(s) }))
      .filter((r) => !r.result.success);

    expect(failures).toEqual([]);
  });

  it("Correctly parses a single item from the data response", () => {
    const expectedSession = {
      id: "finnly:6367642",
      rink: "south-sub",
      activity: "stick-and-puck",
      rawTitle: "Take A Shot",
      startTime: "2026-10-15T09:20:00",
      endTime: "2026-10-15T10:25:00",
      sourceUrl: "https://ssprd.finnlyconnect.com/schedule/247",
      surface: "SSSC Rink 1",
      notes: "",
    } satisfies Session;

    expect(
      parseFinnly(stripFinnlyHtml(southSubFixture), "south-sub").find(
        (s) => s.id === "finnly:6367642",
      ),
    ).toEqual(expectedSession);
  });

  it("Correctly strips out activities we don't care about (7 of 32)", () => {
    const sessions = parseFinnly(stripFinnlyHtml(southSubFixture), "south-sub");
    expect(sessions).toHaveLength(7);
    expect(sessions.map((s) => s.rawTitle)).not.toContain(
      "Silver Skates - Public Skate",
    );
  });
});

describe("Finnly Adapter, Family Sports (parse)", () => {
  it("Every output passes Session.safeParse", () => {
    const failures = parseFinnly(
      stripFinnlyHtml(familySportsFixture),
      "family-sports",
    )
      .map((s) => ({ id: s.id, result: Session.safeParse(s) }))
      .filter((r) => !r.result.success);

    expect(failures).toEqual([]);
  });

  it("Correctly parses a single item from the data response", () => {
    const expectedSession = {
      id: "finnly:6367652",
      rink: "family-sports",
      activity: "stick-and-puck",
      rawTitle: "Take A Shot",
      startTime: "2026-10-16T11:40:00",
      endTime: "2026-10-16T12:40:00",
      sourceUrl: "https://ssprd.finnlyconnect.com/schedule/246",
      surface: "FSC Avalanche Rink",
      notes: "",
    } satisfies Session;

    expect(
      parseFinnly(stripFinnlyHtml(familySportsFixture), "family-sports").find(
        (s) => s.id === "finnly:6367652",
      ),
    ).toEqual(expectedSession);
  });

  it("Correctly strips out activities we don't care about (4 of 42)", () => {
    const sessions = parseFinnly(
      stripFinnlyHtml(familySportsFixture),
      "family-sports",
    );
    expect(sessions).toHaveLength(4);
    expect(sessions.map((s) => s.rawTitle)).not.toContain("Adult Drop In");
  });
});

afterEach(() => {
  vi.unstubAllGlobals(); // put the real fetch back after every test
});

function stubFetch(response: Response) {
  const fake = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fake);
  return fake;
}

function htmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("Finnly Adapter (fetch)", () => {
  it("requests the rink's schedule page with our user agent", async () => {
    const fake = stubFetch(
      htmlResponse('_onlineScheduleList = [{"EventId":1}];'),
    );
    await fetchFinnly("family-sports");

    const [url, init] = fake.mock.calls[0]!;
    expect(url).toBe("https://ssprd.finnlyconnect.com/schedule/246");
    expect(init.headers["user-agent"]).toContain("ice-time-scraper");
  });

  it("returns the schedule data pulled out of the page", async () => {
    stubFetch(
      htmlResponse('<script>_onlineScheduleList = [{"EventId":1}];</script>'),
    );
    await expect(fetchFinnly("south-sub")).resolves.toEqual([{ EventId: 1 }]);
  });

  it("throws on a non-2xx status (site down), even though the error page is HTML", async () => {
    stubFetch(htmlResponse("<html>Service Unavailable</html>", 503));
    await expect(fetchFinnly("south-sub")).rejects.toThrow("HTTP 503");
  });

  it("throws when the response isn't HTML", async () => {
    stubFetch(
      new Response("{}", { headers: { "content-type": "application/json" } }),
    );
    await expect(fetchFinnly("south-sub")).rejects.toThrow("not HTML");
  });
});
