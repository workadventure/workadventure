import { z } from "zod";

export const isCameraFollowPlayerEvent = z.object({
    smooth: z.boolean(),
    duration: z.optional(z.number()),
});

/**
 * A message sent from the iFrame to the game to make the camera follow player.
 */
export type CameraFollowPlayerEvent = z.infer<typeof isCameraFollowPlayerEvent>;
