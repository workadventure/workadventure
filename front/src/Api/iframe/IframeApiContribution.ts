import type * as tg from "generic-type-guard";
import type { IframeEvent, IframeEventMap, IframeResponseEventMap } from '../Events/IframeEvent';
import {registeredCallbacks} from "../../registered_callbacks";



export function sendToWorkadventure(content: IframeEvent<keyof IframeEventMap>) {
    window.parent.postMessage(content, "*")
}
type GuardedType<Guard extends tg.TypeGuard<unknown>> = Guard extends tg.TypeGuard<infer T> ? T : never

export function apiCallback<T extends keyof IframeResponseEventMap>(callbackData: IframeCallbackContribution<T>): IframeCallbackContribution<keyof IframeResponseEventMap> {
    const iframeCallback = {
        typeChecker: callbackData.typeChecker,
        callback: callbackData.callback
    } as IframeCallback<T>;

    const newCallback = { [callbackData.type]: iframeCallback };
    Object.assign(registeredCallbacks, newCallback)
    return callbackData as unknown as IframeCallbackContribution<keyof IframeResponseEventMap>;
}

export interface IframeCallback<Key extends keyof IframeResponseEventMap, T = IframeResponseEventMap[Key], Guard = tg.TypeGuard<T>> {

    typeChecker: Guard,
    callback: (payloadData: T) => void
}

export interface IframeCallbackContribution<Key extends keyof IframeResponseEventMap> extends IframeCallback<Key> {

    type: Key
}

/**
 * !! be aware that the implemented attributes (addMethodsAtRoot and subObjectIdentifier) must be readonly
 *
 *
 */

export abstract class IframeApiContribution<T extends {
    callbacks: Array<IframeCallbackContribution<keyof IframeResponseEventMap>>,
}> {

    abstract callbacks: T["callbacks"]
}
