import { z } from "zod";
import { ConstraintMessage } from "./ConstraintMessage";
import { MessageMessage } from "./MessageMessage";
import { MessageStatusMessage } from "./MessageStatusMessage";
import { BlockMessage } from "./BlockMessage";
import { UnblockMessage } from "./UnblockMessage";

export const P2PMessage = z.union([
    ConstraintMessage,
    MessageMessage,
    MessageStatusMessage,
    BlockMessage,
    UnblockMessage,
]);

/**
 * This type describes all possible messages shared over a P2P data channel.
 */
export type P2PMessage = z.infer<typeof P2PMessage>;
