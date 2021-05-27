import type { ChatEvent } from "./Api/Events/ChatEvent";
import { IframeEvent, IframeEventMap, IframeResponseEventMap, isIframeResponseEventWrapper } from "./Api/Events/IframeEvent";
import { isUserInputChatEvent, UserInputChatEvent } from "./Api/Events/UserInputChatEvent";
import { Subject } from "rxjs";
import { EnterLeaveEvent, isEnterLeaveEvent } from "./Api/Events/EnterLeaveEvent";
import type { OpenPopupEvent } from "./Api/Events/OpenPopupEvent";
import { isButtonClickedEvent } from "./Api/Events/ButtonClickedEvent";
import type { ClosePopupEvent } from "./Api/Events/ClosePopupEvent";
import type { OpenTabEvent } from "./Api/Events/OpenTabEvent";
import type { GoToPageEvent } from "./Api/Events/GoToPageEvent";
import type { OpenCoWebSiteEvent } from "./Api/Events/OpenCoWebSiteEvent";
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
    openTab(url : string): void;
    goToPage(url : string): void;
    openCoWebSite(url : string): void;
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
    /**
     * Send a message in the chat.
     * Only the local user will receive this message.
     */
    sendChatMessage(message: string, author: string) {
        window.parent.postMessage({
            'type': 'chat',
            'data': {
                'message': message,
                'author': author
            } as ChatEvent
        }, '*');
    },
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

    openCoWebSite(url : string) : void{
        window.parent.postMessage({
            "type" : 'openCoWebSite',
            "data" : {
                url
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
        }

    }

    // ...
});