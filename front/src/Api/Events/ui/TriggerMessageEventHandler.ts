import { Subject } from "rxjs";
import { iframeListener } from "../../IframeListener";
import {
    isMessageReferenceEvent,
    isTriggerMessageEvent,
    MessageReferenceEvent,
    removeTriggerMessage,
    triggerMessage,
    TriggerMessageEvent,
} from "./TriggerMessageEvent";
import * as tg from "generic-type-guard";
export function sendMessageTriggeredEvent(uuid: string) {
    iframeListener.postMessage({
        type: "messageTriggered",
        data: {
            uuid,
        } as MessageReferenceEvent,
    });
}

const isTriggerMessageEventObject = new tg.IsInterface()
    .withProperties({
        type: tg.isSingletonString(triggerMessage),
        data: isTriggerMessageEvent,
    })
    .get();

const isTriggerMessageRemoveEventObject = new tg.IsInterface()
    .withProperties({
        type: tg.isSingletonString(removeTriggerMessage),
        data: isMessageReferenceEvent,
    })
    .get();

export const isTriggerMessageHandlerEvent = tg.isUnion(isTriggerMessageEventObject, isTriggerMessageRemoveEventObject);
