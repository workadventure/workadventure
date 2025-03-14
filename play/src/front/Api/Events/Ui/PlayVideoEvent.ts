import { z } from "zod";

export const isVideoConfig = z.object({
    /**
     * Whether the video should loop.
     */
    loop: z.boolean().optional(),
    /**
     * The name displayed at the bottom left of the video.
     */
    name: z.string().optional(),
    /**
     * A link to the avatar of the speaker, displayed at the bottom left of the video.
     */
    avatar: z.string().optional(),
});

export const isPlayVideoEvent = z.object({
    url: z.string(),
    config: z.optional(isVideoConfig),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type PlayVideoEvent = z.infer<typeof isPlayVideoEvent>;
export type VideoConfig = z.infer<typeof isVideoConfig>;
