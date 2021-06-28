import type * as tg from "generic-type-guard";
import type { IframeEvent, IframeEventMap, IframeResponseEventMap } from '../Events/IframeEvent';

export function sendToWorkadventure(content: IframeEvent<keyof IframeEventMap>) {
    window.parent.postMessage(content, "*")
}
type GuardedType<Guard extends tg.TypeGuard<unknown>> = Guard extends tg.TypeGuard<infer T> ? T : never

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
