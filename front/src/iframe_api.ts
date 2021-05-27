import { ChatEvent } from "./Api/Events/ChatEvent";
import { IframeEvent, IframeEventMap, IframeResponseEventMap, isIframeResponseEventWrapper } from "./Api/Events/IframeEvent";
import { isUserInputChatEvent, UserInputChatEvent } from "./Api/Events/UserInputChatEvent";
import { Subject } from "rxjs";
import { EnterLeaveEvent, isEnterLeaveEvent } from "./Api/Events/EnterLeaveEvent";

import { isButtonClickedEvent } from "./Api/Events/ButtonClickedEvent";
import { OpenTabEvent } from "./Api/Events/OpenTabEvent";
import { GoToPageEvent } from "./Api/Events/GoToPageEvent";
import { OpenCoWebSiteEvent, OpenCoWebSiteOptionsEvent } from "./Api/Events/OpenCoWebSiteEvent";
import { LoadPageEvent } from './Api/Events/LoadPageEvent';
import { isMenuItemClickedEvent } from './Api/Events/MenuItemClickedEvent';
import { MenuItemRegisterEvent } from './Api/Events/MenuItemRegisterEvent';
import { GameStateEvent, isGameStateEvent } from './Api/Events/ApiGameStateEvent';
import { updateTile, UpdateTileEvent } from './Api/Events/ApiUpdateTileEvent';
import { isMessageReferenceEvent, removeTriggerMessage, triggerMessage, TriggerMessageCallback, TriggerMessageEvent } from './Api/Events/TriggerMessageEvent';
import { HasMovedEvent, HasMovedEventCallback, isHasMovedEvent } from './Api/Events/HasMovedEvent';

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
    exitSceneTo(url: string): void;
    openCoWebSite(url: string, options?: OpenCoWebSiteOptionsEvent): void;
    closeCoWebSite(): void;
    disablePlayerControl(): void;
    restorePlayerControl(): void;
    displayBubble(): void;
    removeBubble(): void;
    registerMenuCommand(commandDescriptor: string, callback: (commandDescriptor: string) => void): void
    getGameState(): Promise<GameStateEvent>
    onMoveEvent(callback: (moveEvent: HasMovedEvent) => void): void

    updateTile(tileData: UpdateTileEvent): void

    triggerMessage(message: string, callback: () => void): string
    removeTriggerMessage(uuid: string): void

    onload(callback: () => void): void
}




declare global {

    interface Window {
        WA: WorkAdventureApi
    }
    let WA: WorkAdventureApi
}

const userInputChatStream: Subject<UserInputChatEvent> = new Subject();

const menuCallbacks: Map<string, (command: string) => void> = new Map()


function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const stateResolvers: Array<(event: GameStateEvent) => void> = []
const callbacks: {
    onload?: () => void
    [type: string]: HasMovedEventCallback | TriggerMessageCallback | undefined
} = {}


function postToParent(content: IframeEvent<keyof IframeEventMap>) {
    window.parent.postMessage(content, "*")
}
let moveEventUuid: string | undefined;

window.WA = {
    removeTriggerMessage(uuid: string): void {
        window.parent.postMessage({
            type: removeTriggerMessage,
            data: {
                uuid: uuid
            } as TriggerMessageEvent
        }, "*")
    },
    triggerMessage(message: string, callback: () => void): string {
        const uuid = uuidv4();
        callbacks[uuid] = callback;
        window.parent.postMessage({
            type: triggerMessage,
            data: {
                message,
                uuid: uuid
            } as TriggerMessageEvent
        }, "*")

        return uuid
    },
    onMoveEvent(callback: HasMovedEventCallback): void {
        moveEventUuid = uuidv4();
        callbacks[moveEventUuid] = callback;
        postToParent({
            type: "enableMoveEvents",
            data: undefined
        })

        window.parent.postMessage({
            type: "enable"
        }, "*")
    },


    updateTile(data: UpdateTileEvent) {
        window.parent.postMessage({
            type: updateTile,
            data: data
        }, "*")
    },

    getGameState() {
        return new Promise<GameStateEvent>((resolver, thrower) => {
            stateResolvers.push(resolver);
            window.parent.postMessage({
                type: "getState"
            }, "*")
        })
    },

    /*
        /**
         * Send a message in the chat.
         * Only the local user will receive this message.
         *
        sendChatMessage(message: string, author: string) {
            window.parent.postMessage({
                'type': 'chat',
                'data': {
                    'message': message,
                    'author': author
                } as ChatEvent
            }, '*');
        },*/
    disablePlayerControl(): void {
        window.parent.postMessage({ 'type': 'disablePlayerControl' }, '*');
    },

    restorePlayerControl(): void {
        window.parent.postMessage({ 'type': 'restorePlayerControl' }, '*');
    },

    onload(callback: () => void) {
        callbacks["onload"] = callback
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

    exitSceneTo(url: string): void {
        window.parent.postMessage({
            "type": 'loadPage',
            "data": {
                url
            } as LoadPageEvent
        }, '*');
    },

    openCoWebSite(url: string, options: OpenCoWebSiteOptionsEvent = {}): void {
        window.parent.postMessage({
            "type": 'openCoWebSite',
            "data": {
                url,
                options
            } as OpenCoWebSiteEvent
        }, '*');
    },

    closeCoWebSite(): void {
        window.parent.postMessage({
            "type": 'closeCoWebSite'
        }, '*');
    },

    registerMenuCommand(commandDescriptor: string, callback: (commandDescriptor: string) => void) {
        menuCallbacks.set(commandDescriptor, callback);
        window.parent.postMessage({
            'type': 'registerMenuCommand',
            'data': {
                menutItem: commandDescriptor
            } as MenuItemRegisterEvent
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

        if (registeredCallbacks[payload.type] && registeredCallbacks[payload.type]?.typeChecker(payloadData)) {
            registeredCallbacks[payload.type]?.callback(payloadData)
            return
        }

        if (payload.type === 'userInputChat' && isUserInputChatEvent(payloadData)) {
            userInputChatStream.next(payloadData);
        } else if (payload.type == "menuItemClicked" && isMenuItemClickedEvent(payload.data)) {
            const callback = menuCallbacks.get(payload.data.menuItem);
            if (callback) {
                callback(payload.data.menuItem)
            }
        } else if (payload.type == "gameState" && isGameStateEvent(payloadData)) {
            stateResolvers.forEach(resolver => {
                resolver(payloadData);
            })
        } else if (payload.type == "messageTriggered" && isMessageReferenceEvent(payloadData)) {
            (callbacks[payloadData.uuid] as TriggerMessageCallback)();
        } else if (payload.type == "hasMovedEvent" && moveEventUuid && typeof payloadData == "string") {
            const movedEvnt = JSON.parse(payloadData)
            if (isHasMovedEvent(movedEvnt)) {
                callbacks[moveEventUuid]?.(movedEvnt)
            }
        } else if (payload.type == "listenersRegistered") {
            (callbacks["onload"] as () => void)();
        }
    }

    // ...
});