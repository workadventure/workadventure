import * as tg from "generic-type-guard";
import { Subject } from 'rxjs';
import { iframeListener } from '../IframeListener';
export const triggerMessage = "triggerMessage"


export const isTriggerMessageEvent = new tg.IsInterface().withProperties({
    message: tg.isString,
    uuid: tg.isString
}).get()

const isTriggerMessageEventObject = new tg.IsInterface().withProperties({
    type: tg.isSingletonString(triggerMessage),
    data: isTriggerMessageEvent
}).get()


export type TriggerMessageEvent = tg.GuardedType<typeof isTriggerMessageEvent>;

export const removeTriggerMessage = "removeTriggerMessage"

export const isMessageReferenceEvent =
    new tg.IsInterface().withProperties({
        uuid: tg.isString
    }).get();
const isTriggerMessageRemoveEventObject = new tg.IsInterface().withProperties({
    type: tg.isSingletonString(removeTriggerMessage),
    data: isMessageReferenceEvent
}).get()


export type MessageReferenceEvent = tg.GuardedType<typeof isMessageReferenceEvent>;


const _triggerMessageEvent: Subject<TriggerMessageEvent> = new Subject();
const _removeTriggerMessageEvent: Subject<MessageReferenceEvent> = new Subject();

export const triggerMessageEvent = _triggerMessageEvent.asObservable();

export const removeTriggerMessageEvent = _removeTriggerMessageEvent.asObservable();




export const isTriggerMessageHandlerEvent = tg.isUnion(isTriggerMessageEventObject, isTriggerMessageRemoveEventObject)


export function triggerMessageEventHandler(event: tg.GuardedType<typeof isTriggerMessageHandlerEvent>) {
    if (isTriggerMessageEventObject(event)) {
        _triggerMessageEvent.next(event.data)
    } else if (isTriggerMessageRemoveEventObject(event)) {
        _removeTriggerMessageEvent.next(event.data)
    }
}

export function sendMessageTriggeredEvent(uuid: string) {
    iframeListener.postMessage({
        'type': 'messageTriggered',
        'data': {
            uuid,
        } as MessageReferenceEvent
    });
}