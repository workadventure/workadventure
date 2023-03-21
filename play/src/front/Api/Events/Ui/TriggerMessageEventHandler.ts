import { z } from "zod";
import {
    isMessageReferenceEvent,
    isTriggerActionMessageEvent,
    removeActionMessage,
    triggerActionMessage,
} from "./TriggerActionMessageEvent";

const isTriggerMessageEventObject = z.object({
    type: z.enum([triggerActionMessage]),
    data: isTriggerActionMessageEvent,
});

const isTriggerMessageRemoveEventObject = z.object({
    type: z.enum([removeActionMessage]),
    data: isMessageReferenceEvent,
});

export const isTriggerMessageHandlerEvent = z.union([isTriggerMessageEventObject, isTriggerMessageRemoveEventObject]);
