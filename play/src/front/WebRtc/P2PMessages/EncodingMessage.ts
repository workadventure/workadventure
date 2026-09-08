import { z } from "zod";

/**
 * Sent by the video sender to the viewer each time it changes how it encodes for that viewer: the frame rate the
 * viewer should expect (0 while the sender pauses the video because the viewer does not display it). Lets the viewer
 * tell deliberate frame rate changes from an unstable connection.
 */
export const EncodingMessage = z.object({
    type: z.literal("encoding"),
    expectedFps: z.number().nonnegative(),
});

export type EncodingMessage = z.infer<typeof EncodingMessage>;
