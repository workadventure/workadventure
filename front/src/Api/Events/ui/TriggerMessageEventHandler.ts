import { Subject } from 'rxjs';
import { iframeListener } from '../../IframeListener';
import { isMessageReferenceEvent, isTriggerMessageEvent, MessageReferenceEvent, removeTriggerMessage, triggerMessage, TriggerMessageEvent } from './TriggerMessageEvent';
import * as tg from "generic-type-guard";
export function sendMessageTriggeredEvent(uuid: string) {
    iframeListener.postMessage({
        'type': 'messageTriggered',
        'data': {
            uuid,
        } as MessageReferenceEvent
    });
}

const _triggerMessageEvent: Subject<TriggerMessageEvent> = new Subject();
const _removeTriggerMessageEvent: Subject<MessageReferenceEvent> = new Subject();

export const triggerMessageEvent = _triggerMessageEvent.asObservable();

export const removeTriggerMessageEvent = _removeTriggerMessageEvent.asObservable();

const isTriggerMessageEventObject = new tg.IsInterface().withProperties({
    type: tg.isSingletonString(triggerMessage),
    data: isTriggerMessageEvent
}).get()
const isTriggerMessageRemoveEventObject = new tg.IsInterface().withProperties({
    type: tg.isSingletonString(removeTriggerMessage),
    data: isMessageReferenceEvent
}).get()


export const isTriggerMessageHandlerEvent = tg.isUnion(isTriggerMessageEventObject, isTriggerMessageRemoveEventObject)




export function triggerMessageEventHandler(event: tg.GuardedType<typeof isTriggerMessageHandlerEvent>) {
    if (isTriggerMessageEventObject(event)) {
        _triggerMessageEvent.next(event.data)
    } else if (isTriggerMessageRemoveEventObject(event)) {
        _removeTriggerMessageEvent.next(event.data)
    }
}