import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fetchBigBear, parseBigBear } from "./big-bear";
import { Session } from "@ice-time/shared";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../test/fixtures/bigbear-2026-10-23.json", import.meta.url),
    "utf8",
  ),
);

afterEach(() => {
  vi.unstubAllGlobals(); // put the real fetch back after every test
});

function stubFetch(response: Response) {
  const fake = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fake);
  return fake;
}

describe("Big Bear Adapter (parse)", () => {
  it("Every output passes Session.safeParse", () => {
    // doing it this way will help us track down problems faster
    const failures = parseBigBear(fixture)
      .map((s) => ({ id: s.id, result: Session.safeParse(s) }))
      .filter((r) => !r.result.success);

    expect(failures).toEqual([]);
  });

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

describe("Big Bear Adapter (fetch)", () => {
  it("sends a POST with all seven days and the week's dates", async () => {
    const fake = stubFetch(
      new Response("[]", { headers: { "content-type": "application/json" } }),
    );
    await fetchBigBear("2026-10-26", "2026-11-01");

    const [, init] = fake.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.body.get("Monday")).toBe("true");
    expect(init.body.get("EndDate")).toBe("2026-11-01");
  });

  it("we throw on a bad result (like when we get blocked)", async () => {
    stubFetch(
      new Response("<html>Object moved</html>", {
        headers: { "content-type": "text/html" },
      }),
    );
    await expect(fetchBigBear("2026-10-26", "2026-11-01")).rejects.toThrow(
      "not JSON",
    );
  });
});
