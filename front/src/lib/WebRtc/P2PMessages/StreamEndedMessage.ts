import { z } from "zod";

export const STREAM_STOPPED_MESSAGE_TYPE = "stream_stopped";
export const STREAM_ENDED_MESSAGE_TYPE = "stream_ended";

export const StreamStoppedMessage = z.object({
    type: z.literal(STREAM_STOPPED_MESSAGE_TYPE),
});
export type StreamStoppedMessage = z.infer<typeof StreamStoppedMessage>;

export const StreamEndedMessage = z.object({
    type: z.literal(STREAM_ENDED_MESSAGE_TYPE),
});
export type StreamEndedMessage = z.infer<typeof StreamEndedMessage>;

export const StreamMessage = z.union([StreamStoppedMessage, StreamEndedMessage]);
