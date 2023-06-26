import { z } from "zod";

export const PointInterface = z.object({
    x: z.number(),
    y: z.number(),
    direction: z.string(),
    moving: z.boolean(),
});

export type PointInterface = z.infer<typeof PointInterface>;
