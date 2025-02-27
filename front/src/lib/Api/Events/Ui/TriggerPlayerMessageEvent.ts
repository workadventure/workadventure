import { z } from "zod";

export const triggerPlayerMessage = "triggerPlayerMessage";
export const removePlayerMessage = "removePlayerMessage";

export const isPlayerMessageType = z.enum(["message"]);

export type PlayerMessageType = z.infer<typeof isPlayerMessageType>;

export const isTriggerPlayerMessageEvent = z.object({
    message: z.string(),
    uuid: z.string(),
    type: isPlayerMessageType,
});

export type TriggerPlayerMessageEvent = z.infer<typeof isTriggerPlayerMessageEvent>;

export const isMessageReferenceEvent = z.object({
    uuid: z.string(),
});

export type MessageReferenceEvent = z.infer<typeof isMessageReferenceEvent>;
