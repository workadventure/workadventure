import { z } from "zod";

export const isAskPositionEvent = z.object({
    uuid: z.string(),
    playUri: z.string(),
});

/**
 * A message sent from the iFrame to the game to ask the position of the user with uuid and walk to him.
 */
export type AskPositionEvent = z.infer<typeof isAskPositionEvent>;
