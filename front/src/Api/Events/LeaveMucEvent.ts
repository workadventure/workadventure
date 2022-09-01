import { z } from "zod";

export const isLeaveMucEvent = z.object({
    url: z.string(),
});

/**
 * A message sent from the iFrame to the game to change the camera position.
 */
export type LeaveMucEvent = z.infer<typeof isLeaveMucEvent>;
