import { z } from "zod";

export const isAppendPCMDataEvent = z.object({
    data: z.instanceof(Float32Array),
});

/**
 * Appends PCM data to the stream played to all players in the current bubble.
 */
export type AppendPCMDataEvent = z.infer<typeof isAppendPCMDataEvent>;
