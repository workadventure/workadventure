import { z } from "zod";
import { StreamEndedMessage } from "./StreamEndedMessage";

// Right now, there is only one message type for screen sharing (StreamEndedMessage), but we might add more in the future.
// When we do so, the P2PScreenSharingMessage will be a union of all possible messages.
export const P2PScreenSharingMessage = StreamEndedMessage;

/**
 * This type describes all possible messages shared over the P2P data channel of the screen sharing connection.
 */
export type P2PScreenSharingMessage = z.infer<typeof P2PScreenSharingMessage>;
