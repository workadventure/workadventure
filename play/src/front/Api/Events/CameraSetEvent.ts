import { z } from "zod";

export const isCameraSetEvent = z.object({
    x: z.number(),
    y: z.number(),
    width: z.optional(z.number()),
    height: z.optional(z.number()),
    lock: z.boolean(),
    smooth: z.boolean(),
    duration: z.optional(z.number()),
});

/**
 * A message sent from the iFrame to the game to change the camera position.
 */
export type CameraSetEvent = z.infer<typeof isCameraSetEvent>;
