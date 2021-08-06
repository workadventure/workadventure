import {
    isMessageReferenceEvent,
    isTriggerActionMessageEvent,
    removeActionMessage,
    triggerActionMessage,
} from "./TriggerActionMessageEvent";

import * as tg from "generic-type-guard";

const isTriggerMessageEventObject = new tg.IsInterface()
    .withProperties({
        type: tg.isSingletonString(triggerActionMessage),
        data: isTriggerActionMessageEvent,
    })
    .get();

const isTriggerMessageRemoveEventObject = new tg.IsInterface()
    .withProperties({
        type: tg.isSingletonString(removeActionMessage),
        data: isMessageReferenceEvent,
    })
    .get();

export const isTriggerMessageHandlerEvent = tg.isUnion(isTriggerMessageEventObject, isTriggerMessageRemoveEventObject);
