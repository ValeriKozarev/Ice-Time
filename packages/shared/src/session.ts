import { z } from "zod";

// standardizing how we will be formatting time strings from the various platforms
export const LocalDateTime = z.iso
  .datetime({ local: true, precision: 0 })
  .refine((s) => !s.endsWith("Z"), {
    message: "LocalDateTime must not have a timezone offset",
  });

// zod schemas
export const Activity = z.enum(["public-skate", "stick-and-puck"]);
export const Rink = z.enum([
  "big-bear",
  "edge",
  "family-sports",
  "south-sub",
  "joy-burns",
]);
export const Session = z
  .strictObject({
    id: z.string().min(1),
    rink: Rink,
    activity: Activity,
    rawTitle: z.string(),
    startTime: LocalDateTime,
    endTime: LocalDateTime,
    sourceUrl: z.httpUrl(),
    surface: z.string().optional(), // some sites specify which sheet you're on
    notes: z.string().optional(), // some sites have extra info about the session
    capacity: z
      .strictObject({
        // some sites give you the number of available spots without authenticating
        available: z.int().nonnegative(),
        total: z.int().nonnegative(),
      })
      .refine((c) => c.available <= c.total, {
        message: "available spots must be less than or equal to total spots",
        path: ["available"],
      })
      .optional(),
  })
  .refine((s) => s.startTime < s.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });
// result for checking a single rink so we can report if it failed
export const RinkStatus = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("ok") }),
  z.strictObject({ status: z.literal("failed"), error: z.string() }),
]);
// the overall shape from a weekly scrape that we will visualize in the app
export const ScrapeResult = z.strictObject({
  scrapedAt: z.iso.datetime(),
  rinks: z.record(Rink, RinkStatus),
  sessions: z.array(Session),
});

// and corresponding types should have the same name
export type Activity = z.infer<typeof Activity>;
export type Rink = z.infer<typeof Rink>;
export type Session = z.infer<typeof Session>;
export type RinkStatus = z.infer<typeof RinkStatus>;
export type ScrapeResult = z.infer<typeof ScrapeResult>;
