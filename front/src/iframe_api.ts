import { IframeResponseEvent, IframeResponseEventMap, isIframeResponseEventWrapper, TypedMessageEvent } from "./Api/Events/IframeEvent";
import Bubble from "./Api/iframe/Bubble";
import chatmessage from "./Api/iframe/chatmessage";
import CoWebsite from "./Api/iframe/CoWebsite";
import type { IframeCallback } from './Api/iframe/IframeApiContribution';
import Navigation from "./Api/iframe/Navigation";
import Player from "./Api/iframe/Player";
import popupApi from "./Api/iframe/popup";
import Sound from "./Api/iframe/Sound";
import zoneRvents from "./Api/iframe/zone-events";
import type { WorkAdventureApi } from './iframe_api.d';

export const registeredCallbacks: { [K in keyof IframeResponseEventMap]?: IframeCallback<K> } = {}

const apis = [
    popupApi, Navigation, Player, Bubble,
    chatmessage, Sound, zoneRvents, CoWebsite
]

export type WorkadventureImport = typeof apis

declare global {

    interface Window {
        WA: WorkAdventureApi
    }
    let WA: WorkAdventureApi
}

const wa: Partial<WorkAdventureApi> = {}
for (const apiImport of apis) {
    const commandPrototype = Object.getPrototypeOf(apiImport);
    const commandClassPropertyNames = Object.getOwnPropertyNames(commandPrototype).filter(name => name !== "constructor");
    const importObject: Partial<WorkAdventureApi> = {}
    for (const prop of commandClassPropertyNames) {
        const apiImportKey = prop as keyof typeof apiImport;
        if (typeof apiImport[apiImportKey] === "function") {
            importObject[apiImportKey as keyof WorkAdventureApi] = commandPrototype[apiImportKey] as never
        }
    }
    wa[apiImport.subObjectIdentifier] = importObject as never
    if (apiImport.addMethodsAtRoot) {
        Object.assign(wa, importObject)
    }
}

window.WA = Object.assign({}, wa) as WorkAdventureApi

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
