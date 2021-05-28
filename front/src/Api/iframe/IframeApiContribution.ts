import type * as tg from "generic-type-guard";
import { registeredCallbacks } from '../../iframe_api';
import type { IframeEvent, IframeEventMap, IframeResponseEventMap } from '../Events/IframeEvent';



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

export type PossibleSubobjects = "zone" | "chat" | "ui" | "nav" | "sound" | "cowebsite" | "player" | "bubble"
/**
 * !! be aware that the implemented attributes (addMethodsAtRoot and subObjectIdentifier) must be readonly
 * 
 * 
 */

export abstract class IframeApiContribution<T extends {
    callbacks: Array<IframeCallbackContribution<keyof IframeResponseEventMap>>,
    readonly subObjectIdentifier: PossibleSubobjects,
    readonly addMethodsAtRoot: boolean | undefined
}> {

    abstract callbacks: T["callbacks"]

    /**
     * @deprecated this is only there for backwards compatibility on new apis this should be set to false or ignored
     */
    addMethodsAtRoot = false

    abstract readonly subObjectIdentifier: T["subObjectIdentifier"]

}