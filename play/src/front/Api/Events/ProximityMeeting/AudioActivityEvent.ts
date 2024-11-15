import { z } from "zod";

export const isAudioActivityEvent = z.object({
    event: z.union([z.literal("voiceStart"), z.literal("voiceStop")]),
    userId: z.number(),
});

/**
 * Detects who is talking in the audio stream.
 */
export type AudioActivityEvent = z.infer<typeof isAudioActivityEvent>;
