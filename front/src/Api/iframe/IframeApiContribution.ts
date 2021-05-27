import type * as tg from "generic-type-guard";
import type { IframeEvent, IframeEventMap, IframeResponseEventMap } from '../Events/IframeEvent';



export function sendToWorkadventure(content: IframeEvent<keyof IframeEventMap>) {
    window.parent.postMessage(content, "*")
}
type GuardedType<Guard extends tg.TypeGuard<unknown>> = Guard extends tg.TypeGuard<infer T> ? T : never

export function apiCallback<T extends tg.TypeGuard<unknown>>(callbackData: IframeCallbackContribution<T>) {

    return callbackData
}

export interface IframeCallbackContribution<Guard extends tg.TypeGuard<unknown>, T = GuardedType<Guard>> {

    type: keyof IframeResponseEventMap,
    typeChecker: Guard,
    callback: (payloadData: T) => void
}

export type PossibleSubobjects = "zone" | "chat" | "ui" | "nav" | "sound" | "cowebsite" | "player" | "bubble"
/**
 * !! be aware that the implemented attributes (addMethodsAtRoot and subObjectIdentifier) must be readonly
 * 
 * 
 */

export abstract class IframeApiContribution<T extends {
    // i think this is specific enough
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callbacks: Array<IframeCallbackContribution<tg.TypeGuard<any>>>,
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