import { registeredCallbacks } from "../../iframe_api";
import type { IframeResponseEventMap } from '../Events/IframeEvent';
/*export function registerWorkadventureCommand<T>(commnds: T): T {
    const commandPrototype = Object.getPrototypeOf(commnds);
    const commandClassPropertyNames = Object.getOwnPropertyNames(commandPrototype).filter(name => name !== "constructor");
    for (const key of commandClassPropertyNames) {
        window.WA[key as keyof WorkAdventureApi] = commandPrototype[key] as never
    }
    return commnds
}
*/

export function registerWorkadvntureCallback<T extends Function>(callbacks: Array<{
    type: keyof IframeResponseEventMap,
    typeChecker: Function,
    callback: T
}>) {
    for (const callback of callbacks) {
        registeredCallbacks[callback.type] = {
            typeChecker: callback.typeChecker,
            callback: callback.callback
        }
    }
    return callbacks
}


