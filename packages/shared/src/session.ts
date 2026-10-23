import { z } from "zod";

// zod schemas
export const Activity = z.enum(["public-skate", "stick-and-puck"]);
export const Rink = z.enum([
  "big-bear",
  "edge",
  "family-sports",
  "south-sub",
  "joy-burns",
]);

// and corresponding types should have the same name
export type Activity = z.infer<typeof Activity>;
export type Rink = z.infer<typeof Rink>;
