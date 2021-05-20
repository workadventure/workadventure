import type { ChatEvent } from "./Api/Events/ChatEvent";
import { IframeEvent, IframeEventMap, isIframeResponseEventWrapper } from "./Api/Events/IframeEvent";
import { isUserInputChatEvent, UserInputChatEvent } from "./Api/Events/UserInputChatEvent";
import { Subject } from "rxjs";
import { EnterLeaveEvent, isEnterLeaveEvent } from "./Api/Events/EnterLeaveEvent";
import type { OpenPopupEvent } from "./Api/Events/OpenPopupEvent";
import { isButtonClickedEvent } from "./Api/Events/ButtonClickedEvent";
import type { ClosePopupEvent } from "./Api/Events/ClosePopupEvent";
import type { OpenTabEvent } from "./Api/Events/OpenTabEvent";
import type { GoToPageEvent } from "./Api/Events/GoToPageEvent";
import type { OpenCoWebSiteEvent } from "./Api/Events/OpenCoWebSiteEvent";
import type { LayerEvent } from "./Api/Events/LayerEvent";
import type { SetPropertyEvent } from "./Api/Events/setPropertyEvent";
import { GameStateEvent, isGameStateEvent } from './Api/Events/GameStateEvent';
import { HasPlayerMovedEvent, HasPlayerMovedEventCallback, isHasPlayerMovedEvent } from './Api/Events/HasPlayerMovedEvent';
import { DataLayerEvent, isDataLayerEvent } from "./Api/Events/DataLayerEvent";
import type { ITiledMap } from "./Phaser/Map/ITiledMap";
import type { MenuItemRegisterEvent } from "./Api/Events/MenuItemRegisterEvent";
import { isMenuItemClickedEvent } from "./Api/Events/MenuItemClickedEvent";
import {TagEvent, isTagEvent} from "./Api/Events/TagEvent";

interface WorkAdventureApi {
    sendChatMessage(message: string, author: string): void;
    onChatMessage(callback: (message: string) => void): void;
    onEnterZone(name: string, callback: () => void): void;
    onLeaveZone(name: string, callback: () => void): void;
    openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup;
    openTab(url: string): void;
    goToPage(url: string): void;
    openCoWebSite(url: string): void;
    closeCoWebSite(): void;
    disablePlayerControls() : void;
    restorePlayerControls() : void;
    displayBubble() : void;
    removeBubble() : void;
    showLayer(layer: string) : void;
    hideLayer(layer: string) : void;
    setProperty(layerName: string, propertyName: string, propertyValue: string | number | boolean | undefined): void;
    disablePlayerControls(): void;
    restorePlayerControls(): void;
    displayBubble(): void;
    removeBubble(): void;
    registerMenuCommand(commandDescriptor: string, callback: (commandDescriptor: string) => void): void
    getMapUrl(): Promise<string>;
    getUuid(): Promise<string | undefined>;
    getRoomId(): Promise<string>;
    getStartLayerName(): Promise<string | null>;
    getNickName(): Promise<string | null>;
    getTagUser(): Promise<string[]>;
    getMap(): Promise<ITiledMap>

    onPlayerMove(callback: (playerMovedEvent: HasPlayerMovedEvent) => void): void
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
function getGameState(): Promise<GameStateEvent> {
    if (immutableData) {
        return Promise.resolve(immutableData);
    }
    else {
        return new Promise<GameStateEvent>((resolver, thrower) => {
            gameStateResolver.push(resolver);
            window.parent.postMessage({
                type: "getState"
            }, "*")
        })
    }
}

function getDataLayer(): Promise<DataLayerEvent> {
    return new Promise<DataLayerEvent>((resolver, thrower) => {
        dataLayerResolver.push(resolver);
        postToParent({
            type: "getDataLayer",
            data: undefined
        })
    })
}

function getTag(): Promise<TagEvent> {
    return new Promise<TagEvent>((resolver, thrower) => {
        tagResolver.push((resolver));
        postToParent({
            type: "getTag",
            data: undefined
        })
    })
}

const gameStateResolver: Array<(event: GameStateEvent) => void> = []
const dataLayerResolver: Array<(event: DataLayerEvent) => void> = []
const tagResolver: Array<(event : TagEvent) => void> = []
let immutableData: GameStateEvent;

const callbackPlayerMoved: { [type: string]: HasPlayerMovedEventCallback | ((arg?: HasPlayerMovedEvent | never) => void) } = {}


function postToParent(content: IframeEvent<keyof IframeEventMap>) {
    window.parent.postMessage(content, "*")
}
let playerUuid: string | undefined;

window.WA = {

    onPlayerMove(callback: HasPlayerMovedEventCallback): void {
        playerUuid = uuidv4();
        callbackPlayerMoved[playerUuid] = callback;
        postToParent({
            type: "onPlayerMove",
            data: undefined
        })
    },

    getTagUser(): Promise<string[]> {
        return getTag().then((res) => {
            return res.list;
        })
    },

    getMap(): Promise<ITiledMap> {
        return getDataLayer().then((res) => {
            return res.data as ITiledMap;
        })
    },

    getNickName(): Promise<string | null> {
      return getGameState().then((res) => {
          return res.nickname;
      })
    },

    getMapUrl(): Promise<string> {
      return getGameState().then((res) => {
          return res.mapUrl;
      })
    },

    getUuid(): Promise<string | undefined> {
        return getGameState().then((res) => {
            return res.uuid;
        })
    },

    getRoomId(): Promise<string> {
        return getGameState().then((res) => {
            return res.roomId;
        })
    },

    getStartLayerName(): Promise<string | null> {
        return getGameState().then((res) => {
            return res.startLayerName;
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
    showLayer(layer: string) : void {
      window.parent.postMessage({
          'type' : 'showLayer',
          'data' : {
              'name' : layer
          } as LayerEvent
      }, '*');
    },
    hideLayer(layer: string) : void {
        window.parent.postMessage({
            'type' : 'hideLayer',
            'data' : {
                'name' : layer
            } as LayerEvent
        }, '*');
    },
    setProperty(layerName: string, propertyName: string, propertyValue: string | number | boolean | undefined): void {
        window.parent.postMessage({
           'type' : 'setProperty',
           'data' : {
               'layerName' : layerName,
               'propertyName' : propertyName,
               'propertyValue' : propertyValue
           } as SetPropertyEvent
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
        } else if (payload.type == "gameState" && isGameStateEvent(payloadData)) {
            gameStateResolver.forEach(resolver => {
                resolver(payloadData);
            })
            immutableData = payloadData;
        } else if (payload.type == "hasPlayerMoved" && isHasPlayerMovedEvent(payloadData) && playerUuid) {
            callbackPlayerMoved[playerUuid](payloadData)
        } else if (payload.type == "dataLayer" && isDataLayerEvent(payloadData)) {
            dataLayerResolver.forEach(resolver => {
                resolver(payloadData);
            })
        } else if (payload.type == "menuItemClicked" && isMenuItemClickedEvent(payload.data)) {
            const callback = menuCallbacks.get(payload.data.menuItem);
            if (callback) {
                callback(payload.data.menuItem)
            }
        } else {
            if (payload.type == "tagList" && isTagEvent(payloadData)) {
                tagResolver.forEach(resolver => {
                    resolver(payloadData);
                })
            }
        }
    }

    // ...
});
