import { z } from "zod";

export const triggerActionMessage = "triggerActionMessage";
export const removeActionMessage = "removeActionMessage";

export const isActionMessageType = z.enum(["message", "warning"]);

export type ActionMessageType = z.infer<typeof isActionMessageType>;

export const isTriggerActionMessageEvent = z.object({
    message: z.string(),
    uuid: z.string(),
    type: isActionMessageType,
});

export type TriggerActionMessageEvent = z.infer<typeof isTriggerActionMessageEvent>;

export const isMessageReferenceEvent = z.object({
    uuid: z.string(),
});

export type MessageReferenceEvent = z.infer<typeof isMessageReferenceEvent>;
