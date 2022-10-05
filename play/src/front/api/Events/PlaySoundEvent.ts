import { z } from "zod";

export const isSoundConfig = z.object({
    volume: z.optional(z.number()),
    loop: z.boolean().optional(),
    mute: z.boolean().optional(),
    rate: z.optional(z.number()),
    detune: z.optional(z.number()),
    seek: z.optional(z.number()),
    delay: z.optional(z.number()),
});

export const isPlaySoundEvent = z.object({
    url: z.string(),
    config: z.optional(isSoundConfig),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type PlaySoundEvent = z.infer<typeof isPlaySoundEvent>;
