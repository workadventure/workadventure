import { z } from "zod";

export const isCameraFollowPlayerEvent = z.object({
    smooth: z.boolean(),
});

/**
 * A message sent from the iFrame to the game to make the camera follow player.
 */
export type CameraFollowPlayerEvent = z.infer<typeof isCameraFollowPlayerEvent>;
