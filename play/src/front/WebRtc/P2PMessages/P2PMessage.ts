import { z } from "zod";
import { ConstraintMessage } from "./ConstraintMessage";
import { BlockMessage } from "./BlockMessage";
import { UnblockMessage } from "./UnblockMessage";

export const STREAM_STOPPED_MESSAGE_TYPE = "stream_stopped";

export const StreamStoppedMessage = z.object({
    type: z.literal(STREAM_STOPPED_MESSAGE_TYPE),
});
export type StreamStoppedMessage = z.infer<typeof StreamStoppedMessage>;

export const KickOffMessage = z.object({
    type: z.literal("kickoff"),
    value: z.string(),
});
export type KickOffMessage = z.infer<typeof KickOffMessage>;

export const P2PMessage = z.union([
    ConstraintMessage,
    BlockMessage,
    UnblockMessage,
    KickOffMessage,
    StreamStoppedMessage,
]);

/**
 * This type describes all possible messages shared over a P2P data channel.
 */
export type P2PMessage = z.infer<typeof P2PMessage>;
