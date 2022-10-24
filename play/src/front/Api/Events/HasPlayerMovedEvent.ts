import { z } from "zod";

export const isHasPlayerMovedEvent = z.object({
    direction: z.enum(["right", "left", "up", "down"]),
    moving: z.boolean(),
    x: z.number(),
    y: z.number(),
    oldX: z.optional(z.number()),
    oldY: z.optional(z.number()),
});

/**
 * A message sent from the game to the iFrame to notify a movement from the current player.
 */
export type HasPlayerMovedEvent = z.infer<typeof isHasPlayerMovedEvent>;

export type HasPlayerMovedEventCallback = (event: HasPlayerMovedEvent) => void;
