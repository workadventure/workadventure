import { z } from "zod";

export const isPlayerPosition = z.object({
    x: z.number(),
    y: z.number(),
});

export type PlayerPosition = z.infer<typeof isPlayerPosition>;
