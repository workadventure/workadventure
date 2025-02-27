import { z } from "zod";

export const isMovePlayerToEventConfig = z.object({
    x: z.number(),
    y: z.number(),
    speed: z.optional(z.number()),
});

export type MovePlayerToEvent = z.infer<typeof isMovePlayerToEventConfig>;
