import { z } from "zod";
import { StreamEndedMessage } from "./StreamEndedMessage";

export const P2PScreenSharingMessage = StreamEndedMessage;

/**
 * This type describes all possible messages shared over a P2P data channel.
 */
export type P2PScreenSharingMessage = z.infer<typeof P2PScreenSharingMessage>;
