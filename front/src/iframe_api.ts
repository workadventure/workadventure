import {ChatEvent, isChatEvent} from "./Api/Events/ChatEvent";
import {isIframeEventWrapper} from "./Api/Events/IframeEvent";
import {isUserInputChatEvent, UserInputChatEvent} from "./Api/Events/UserInputChatEvent";
import {Subject} from "rxjs";
import {EnterLeaveEvent, isEnterLeaveEvent} from "./Api/Events/EnterLeaveEvent";
import {OpenPopupEvent} from "./Api/Events/OpenPopupEvent";
import {isButtonClickedEvent} from "./Api/Events/ButtonClickedEvent";
import {ClosePopupEvent} from "./Api/Events/ClosePopupEvent";
import {OpenTabEvent} from "./Api/Events/OpenTabEvent";
import {GoToPageEvent} from "./Api/Events/GoToPageEvent";
import {OpenCoWebSiteEvent} from "./Api/Events/OpenCoWebSiteEvent";

interface WorkAdventureApi {
    sendChatMessage(message: string, author: string): void;
    onChatMessage(callback: (message: string) => void): void;
    onEnterZone(name: string, callback: () => void): void;
    onLeaveZone(name: string, callback: () => void): void;
    openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup;
    openTab(url : string): void;
    goToPage(url : string): void;
    openCoWebSite(url : string): void;
    closeCoWebSite(): void;
    disablePlayerControl() : void;
    restorePlayerControl() : void;
    displayBubble() : void;
    removeBubble() : void;
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

let popupId = 0;
interface ButtonDescriptor {
    /**
     * The label of the button
     */
    label: string,
    /**
     * The type of the button. Can be one of "normal", "primary", "success", "warning", "error", "disabled"
     */
    className?: "normal"|"primary"|"success"|"warning"|"error"|"disabled",
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
    disablePlayerControl() : void {
        window.parent.postMessage({'type' : 'disablePlayerControl'},'*');
    },

    restorePlayerControl() : void {
        window.parent.postMessage({'type' : 'restorePlayerControl'},'*');
    },

    displayBubble() : void {
        window.parent.postMessage({'type' : 'displayBubble'},'*');
    },

    removeBubble() : void {
        window.parent.postMessage({'type' : 'removeBubble'},'*');
    },

    openTab(url : string) : void{
        window.parent.postMessage({
            "type" : 'openTab',
            "data" : {
                url
            } as OpenTabEvent
            },'*');
    },

    goToPage(url : string) : void{
        window.parent.postMessage({
            "type" : 'goToPage',
            "data" : {
                url
            } as GoToPageEvent
            },'*');
    },

    openCoWebSite(url : string) : void{
        window.parent.postMessage({
            "type" : 'openCoWebSite',
            "data" : {
                url
            } as OpenCoWebSiteEvent
            },'*');
    },

    closeCoWebSite() : void{
        window.parent.postMessage({
            "type" : 'closeCoWebSite'
            },'*');
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

    console.log(payload);

    if (isIframeEventWrapper(payload)) {
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
                throw new Error('Could not find popup with ID "'+payloadData.popupId+'"');
            }
            if (callback) {
                callback(popup);
            }
        }

    }

    // ...
});
