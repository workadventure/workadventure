import { z } from "zod";

export const isJoinMucEvent = z.object({
    url: z.string(),
    name: z.string(),
    type: z.string(),
    subscribe: z.boolean(),
});

/**
 * A message sent from the iFrame to the game to change the camera position.
 */
export type JoinMucEvent = z.infer<typeof isJoinMucEvent>;
