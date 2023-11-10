import { z } from "zod";

export const isPlaySoundInBubbleEvent = z.object({
    url: z.string(),
});

/**
 * A message sent from the iFrame to the game to play a message to all players in a bubble.
 */
export type PlaySoundInBubbleEvent = z.infer<typeof isPlaySoundInBubbleEvent>;
