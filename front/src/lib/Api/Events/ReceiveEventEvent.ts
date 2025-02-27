import { z } from "zod";

export const isReceiveEventEvent = z.object({
    name: z.string(),
    data: z.unknown(),
    senderId: z.number().optional(),
});

export const isReceiveEventIframeEvent = z.object({
    type: z.literal("receiveEvent"),
    data: isReceiveEventEvent,
});

/**
 * A message sent to dispatch an event to/from the iFrame
 */
export type ReceiveEventEvent = z.infer<typeof isReceiveEventEvent>;
