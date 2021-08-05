import * as tg from "generic-type-guard";

export const triggerActionMessage = "triggerActionMessage";
export const removeActionMessage = "removeActionMessage";

export const isActionMessageType = tg.isSingletonStringUnion("message", "warning");

export type ActionMessageType = tg.GuardedType<typeof isActionMessageType>;

export const isTriggerActionMessageEvent = new tg.IsInterface()
    .withProperties({
        message: tg.isString,
        uuid: tg.isString,
        type: isActionMessageType,
    })
    .get();

export type TriggerActionMessageEvent = tg.GuardedType<typeof isTriggerActionMessageEvent>;

export const isMessageReferenceEvent = new tg.IsInterface()
    .withProperties({
        uuid: tg.isString,
    })
    .get();

export type MessageReferenceEvent = tg.GuardedType<typeof isMessageReferenceEvent>;
