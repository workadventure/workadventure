import { Subject } from "rxjs";
import type { GoToPageEvent } from "./Api/Events/GoToPageEvent";
import { IframeResponseEventMap, isIframeResponseEventWrapper } from "./Api/Events/IframeEvent";
import type { OpenCoWebSiteEvent } from "./Api/Events/OpenCoWebSiteEvent";
import type { OpenTabEvent } from "./Api/Events/OpenTabEvent";
import { isUserInputChatEvent, UserInputChatEvent } from "./Api/Events/UserInputChatEvent";

export const registeredCallbacks: { [K in keyof IframeResponseEventMap]?: {
    typeChecker: Function
    callback: Function
} } = {}

const importType = Promise.all([
    import("./Api/iframe/popup"),
    import("./Api/iframe/chatmessage"),
    import("./Api/iframe/zone-events")
])

type PromiseReturnType<P> = P extends Promise<infer T> ? T : P

type WorkadventureCommandClasses = PromiseReturnType<typeof importType>[number]["default"];

type KeysOfUnion<T> = T extends T ? keyof T : never

type ObjectWithKeyOfUnion<Key, O = WorkadventureCommandClasses> = O extends O ? (Key extends keyof O ? O[Key] : never) : never

type ApiKeys = KeysOfUnion<WorkadventureCommandClasses>;

type ObjectOfKey<Key extends ApiKeys, O = WorkadventureCommandClasses> = O extends O ? (Key extends keyof O ? O : never) : never

type ShouldAddAttribute<Key extends ApiKeys> = ObjectWithKeyOfUnion<Key>;

type WorkadventureFunctions = { [K in ApiKeys]: ObjectWithKeyOfUnion<K> extends Function ? K : never }[ApiKeys]

type WorkadventureFunctionsFilteredByRoot = { [K in WorkadventureFunctions]: ObjectOfKey<K>["addMethodsAtRoot"] extends true ? K : never }[WorkadventureFunctions]


type JustMethodKeys<T> = ({ [P in keyof T]: T[P] extends Function ? P : never })[keyof T];
type JustMethods<T> = Pick<T, JustMethodKeys<T>>;

type SubObjectTypes = {
    [importCl in WorkadventureCommandClasses as importCl["subObjectIdentifier"]]: JustMethods<importCl>;
};

type WorkAdventureApiFiles = {
    [Key in WorkadventureFunctionsFilteredByRoot]: ShouldAddAttribute<Key>
} & SubObjectTypes

export interface WorkAdventureApi extends WorkAdventureApiFiles {
    openTab(url: string): void;
    goToPage(url: string): void;
    openCoWebSite(url: string): void;
    closeCoWebSite(): void;
    disablePlayerControls(): void;
    restorePlayerControls(): void;
    displayBubble(): void;
    removeBubble(): void;
}




declare global {

    interface Window {
        WA: WorkAdventureApi
    }
    let WA: WorkAdventureApi
}

const userInputChatStream: Subject<UserInputChatEvent> = new Subject();





window.WA = {
    disablePlayerControls(): void {
        window.parent.postMessage({ 'type': 'disablePlayerControls' }, '*');
    },

    restorePlayerControls(): void {
        window.parent.postMessage({ 'type': 'restorePlayerControls' }, '*');
    },

    displayBubble(): void {
        window.parent.postMessage({ 'type': 'displayBubble' }, '*');
    },

    removeBubble(): void {
        window.parent.postMessage({ 'type': 'removeBubble' }, '*');
    },

    openTab(url: string): void {
        window.parent.postMessage({
            "type": 'openTab',
            "data": {
                url
            } as OpenTabEvent
        }, '*');
    },

    goToPage(url: string): void {
        window.parent.postMessage({
            "type": 'goToPage',
            "data": {
                url
            } as GoToPageEvent
        }, '*');
    },

    openCoWebSite(url: string): void {
        window.parent.postMessage({
            "type": 'openCoWebSite',
            "data": {
                url
            } as OpenCoWebSiteEvent
        }, '*');
    },

    closeCoWebSite(): void {
        window.parent.postMessage({
            "type": 'closeCoWebSite'
        }, '*');
    },
    ...({} as WorkAdventureApiFiles),
}

window.addEventListener('message', message => {
    if (message.source !== window.parent) {
        return; // Skip message in this event listener
    }

    const payload = message.data;

    console.debug(payload);

    if (isIframeResponseEventWrapper(payload)) {
        const payloadData = payload.data;

        if (payload.type === 'userInputChat' && isUserInputChatEvent(payloadData)) {
            userInputChatStream.next(payloadData);
        }

    }

    // ...
});