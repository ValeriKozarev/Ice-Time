import { describe, it, expect } from "vitest";
import { Activity, Rink } from "./session";

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
        }
    );

    it("rejects the site's raw wording", () => {
        expect(() => Rink.parse("Big Bear")).toThrow();
    });
});