import { z } from "zod";

export const isStartStreamInBubbleEvent = z.object({
    sampleRate: z.number(),
});

/**
 * A message sent from the iFrame to the game to start a stream to all starters in a bubble.
 * The sampleRate is the sample rate of the audio stream expressed in Hertz.
 */
export type StartStreamInBubbleEvent = z.infer<typeof isStartStreamInBubbleEvent>;
