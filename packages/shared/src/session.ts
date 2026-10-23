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
export const Session = z.object({
  id: z.string(),
  rink: Rink,
  activity: Activity,
  rawTitle: z.string(),
  startTime: LocalDateTime,
  endTime: LocalDateTime,
  sourceUrl: z.httpUrl(),
});

// and corresponding types should have the same name
export type Activity = z.infer<typeof Activity>;
export type Rink = z.infer<typeof Rink>;
export type Session = z.infer<typeof Session>;
