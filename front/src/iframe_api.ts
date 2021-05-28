import { IframeResponseEvent, IframeResponseEventMap, isIframeResponseEventWrapper, TypedMessageEvent } from "./Api/Events/IframeEvent";
import type { IframeCallback } from './Api/iframe/IframeApiContribution';
import type { WorkAdventureApi } from './iframe_api.d';


export const registeredCallbacks: { [K in keyof IframeResponseEventMap]?: IframeCallback<K> } = {}

const importType = Promise.all([
    import("./Api/iframe/popup"),
    import("./Api/iframe/chatmessage"),
    import("./Api/iframe/Sound"),
    import("./Api/iframe/zone-events"),
    import("./Api/iframe/Navigation"),
    import("./Api/iframe/CoWebsite"),
    import("./Api/iframe/Player"),
    import("./Api/iframe/Bubble")
])

export type WorkadventureImport = typeof importType

declare global {

    interface Window {
        WA: WorkAdventureApi
    }
    let WA: WorkAdventureApi
}

async function populateWa(): Promise<void> {
    const wa: Partial<WorkAdventureApi> = {}
    for (const apiImport of await importType) {
        const classInstance = apiImport.default
        const commandPrototype = Object.getPrototypeOf(classInstance);
        const commandClassPropertyNames = Object.getOwnPropertyNames(commandPrototype).filter(name => name !== "constructor");
        const importObject: Partial<WorkAdventureApi> = {}
        for (const prop of commandClassPropertyNames) {
            const apiImportKey = prop as keyof typeof classInstance;
            if (typeof classInstance[apiImportKey] === "function") {
                importObject[apiImportKey as keyof WorkAdventureApi] = commandPrototype[apiImportKey] as never
            }
        }
        wa[classInstance.subObjectIdentifier] = importObject as never
        if (classInstance.addMethodsAtRoot) {
            Object.assign(wa, importObject)
        }
    }

    window.WA = Object.assign({}, wa) as WorkAdventureApi
}


populateWa()

window.addEventListener('message', <T extends keyof IframeResponseEventMap>(message: TypedMessageEvent<IframeResponseEvent<T>>) => {
    if (message.source !== window.parent) {
        return; // Skip message in this event listener
    }
    const payload = message.data;
    console.debug(payload);

    if (isIframeResponseEventWrapper(payload)) {
        const payloadData = payload.data;

        const callback = registeredCallbacks[payload.type] as IframeCallback<T> | undefined
        if (callback?.typeChecker(payloadData)) {
            callback?.callback(payloadData)
        }
    }

    // ...
});