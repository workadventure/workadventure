import { z } from "zod";

export const isSendEventEvent = z.object({
    key: z.string(),
    value: z.unknown(),
    targetUserIds: z.array(z.number()).optional(),
});

export const isSendEventIframeEvent = z.object({
    type: z.literal("dispatchEvent"),
    data: isSendEventEvent,
});

/**
 * A message sent to dispatch an event to/from the iFrame
 */
export type SendEventEvent = z.infer<typeof isSendEventEvent>;
