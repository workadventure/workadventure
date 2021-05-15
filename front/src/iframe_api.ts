import { ChatEvent } from "./Api/Events/ChatEvent";
import { IframeEvent, IframeEventMap, isIframeResponseEventWrapper } from "./Api/Events/IframeEvent";
import { isUserInputChatEvent, UserInputChatEvent } from "./Api/Events/UserInputChatEvent";
import { Subject } from "rxjs";
import { EnterLeaveEvent, isEnterLeaveEvent } from "./Api/Events/EnterLeaveEvent";
import { OpenPopupEvent } from "./Api/Events/OpenPopupEvent";
import { isButtonClickedEvent } from "./Api/Events/ButtonClickedEvent";
import { ClosePopupEvent } from "./Api/Events/ClosePopupEvent";
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


interface WorkAdventureApi {
    sendChatMessage(message: string, author: string): void;
    onChatMessage(callback: (message: string) => void): void;
    onEnterZone(name: string, callback: () => void): void;
    onLeaveZone(name: string, callback: () => void): void;
    openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup;
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
    // eslint-disable-next-line no-var
    var WA: WorkAdventureApi

}

type ChatMessageCallback = (message: string) => void;
type ButtonClickedCallback = (popup: Popup) => void;

const userInputChatStream: Subject<UserInputChatEvent> = new Subject();
const enterStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();
const leaveStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();
const popups: Map<number, Popup> = new Map<number, Popup>();
const popupCallbacks: Map<number, Map<number, ButtonClickedCallback>> = new Map<number, Map<number, ButtonClickedCallback>>();
const menuCallbacks: Map<string, (command: string) => void> = new Map()
let popupId = 0;
interface ButtonDescriptor {
    /**
     * The label of the button
     */
    label: string,
    /**
     * The type of the button. Can be one of "normal", "primary", "success", "warning", "error", "disabled"
     */
    className?: "normal" | "primary" | "success" | "warning" | "error" | "disabled",
    /**
     * Callback called if the button is pressed
     */
    callback: ButtonClickedCallback,
}

class Popup {
    constructor(private id: number) {
    }

    /**
     * Closes the popup
     */
    public close(): void {
        window.parent.postMessage({
            'type': 'closePopup',
            'data': {
                'popupId': this.id,
            } as ClosePopupEvent
        }, '*');
    }
}
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

    openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup {
        popupId++;
        const popup = new Popup(popupId);
        const btnMap = new Map<number, () => void>();
        popupCallbacks.set(popupId, btnMap);
        let id = 0;
        for (const button of buttons) {
            const callback = button.callback;
            if (callback) {
                btnMap.set(id, () => {
                    callback(popup);
                });
            }
            id++;
        }


        window.parent.postMessage({
            'type': 'openPopup',
            'data': {
                popupId,
                targetObject,
                message,
                buttons: buttons.map((button) => {
                    return {
                        label: button.label,
                        className: button.className
                    };
                })
            } as OpenPopupEvent
        }, '*');

        popups.set(popupId, popup)
        return popup;
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
    /**
     * Listen to messages sent by the local user, in the chat.
     */
    onChatMessage(callback: ChatMessageCallback): void {
        userInputChatStream.subscribe((userInputChatEvent) => {
            callback(userInputChatEvent.message);
        });
    },
    onEnterZone(name: string, callback: () => void): void {
        let subject = enterStreams.get(name);
        if (subject === undefined) {
            subject = new Subject<EnterLeaveEvent>();
            enterStreams.set(name, subject);
        }
        subject.subscribe(callback);
    },
    onLeaveZone(name: string, callback: () => void): void {
        let subject = leaveStreams.get(name);
        if (subject === undefined) {
            subject = new Subject<EnterLeaveEvent>();
            leaveStreams.set(name, subject);
        }
        subject.subscribe(callback);
    },
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
        } else if (payload.type === 'enterEvent' && isEnterLeaveEvent(payloadData)) {
            enterStreams.get(payloadData.name)?.next();
        } else if (payload.type === 'leaveEvent' && isEnterLeaveEvent(payloadData)) {
            leaveStreams.get(payloadData.name)?.next();
        } else if (payload.type === 'buttonClickedEvent' && isButtonClickedEvent(payloadData)) {
            const callback = popupCallbacks.get(payloadData.popupId)?.get(payloadData.buttonId);
            const popup = popups.get(payloadData.popupId);
            if (popup === undefined) {
                throw new Error('Could not find popup with ID "' + payloadData.popupId + '"');
            }
            if (callback) {
                callback(popup);
            }
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
