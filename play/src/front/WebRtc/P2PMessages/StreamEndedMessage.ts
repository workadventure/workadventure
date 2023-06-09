import { z } from "zod";

export const StreamEndedMessage = z.object({
    type: z.literal("stream_ended"),
});

export type StreamEndedMessage = z.infer<typeof StreamEndedMessage>;
