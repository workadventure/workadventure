import { z } from "zod";
import {
    isMessageReferenceEvent,
    isTriggerActionMessageEvent,
    removeActionMessage,
    triggerActionMessage,
} from "./TriggerActionMessageEvent";
import { removePlayerMessage, triggerPlayerMessage } from "./TriggerPlayerMessageEvent";

const isTriggerMessageEventObject = z.object({
    type: z.enum([triggerActionMessage, triggerPlayerMessage]),
    data: isTriggerActionMessageEvent,
});

const isTriggerMessageRemoveEventObject = z.object({
    type: z.enum([removeActionMessage, removePlayerMessage]),
    data: isMessageReferenceEvent,
});

export const isTriggerMessageHandlerEvent = z.union([isTriggerMessageEventObject, isTriggerMessageRemoveEventObject]);
