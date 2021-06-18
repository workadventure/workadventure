import {registeredCallbacks} from "./registered_callbacks";
import {
    IframeResponseEvent,
    IframeResponseEventMap,
    isIframeResponseEventWrapper,
    TypedMessageEvent
} from "./Api/Events/IframeEvent";
import chat from "./Api/iframe/chat";
import type {IframeCallback} from './Api/iframe/IframeApiContribution';
import nav from "./Api/iframe/nav";
import controls from "./Api/iframe/controls";
import ui, {ButtonDescriptor, Popup} from "./Api/iframe/ui";
import sound, {Sound} from "./Api/iframe/sound";
import room from "./Api/iframe/room";


const wa = {
    ui,
    nav,
    controls,
    chat,
    sound,
    room,

    // All methods below are deprecated and should not be used anymore.
    // They are kept here for backward compatibility.

    /**
     * @deprecated Use WA.chat.sendChatMessage instead
     */
    sendChatMessage(message: string, author: string): void {
        console.log('Method WA.sendChatMessage is deprecated. Please use WA.chat.sendChatMessage instead');
        chat.sendChatMessage(message, author);
    },
    /**
     * @deprecated Use WA.chat.disablePlayerControls instead
     */
    disablePlayerControls(): void {
        console.log('Method WA.disablePlayerControls is deprecated. Please use WA.controls.disablePlayerControls instead');
        controls.disablePlayerControls();
    },

    /**
     * @deprecated Use WA.controls.restorePlayerControls instead
     */
    restorePlayerControls(): void {
        console.log('Method WA.restorePlayerControls is deprecated. Please use WA.controls.restorePlayerControls instead');
        controls.restorePlayerControls();
    },

    /**
     * @deprecated Use WA.ui.displayBubble instead
     */
    displayBubble(): void {
        console.log('Method WA.displayBubble is deprecated. Please use WA.ui.displayBubble instead');
        ui.displayBubble();
    },

    /**
     * @deprecated Use WA.ui.removeBubble instead
     */
    removeBubble(): void {
        console.log('Method WA.removeBubble is deprecated. Please use WA.ui.removeBubble instead');
        ui.removeBubble();
    },

    /**
     * @deprecated Use WA.nav.openTab instead
     */
    openTab(url: string): void {
        console.log('Method WA.openTab is deprecated. Please use WA.nav.openTab instead');
        nav.openTab(url);
    },

    /**
     * @deprecated Use WA.sound.loadSound instead
     */
    loadSound(url: string) : Sound {
        console.log('Method WA.loadSound is deprecated. Please use WA.sound.loadSound instead');
        return sound.loadSound(url);
    },

    /**
     * @deprecated Use WA.nav.goToPage instead
     */
    goToPage(url : string) : void {
        console.log('Method WA.goToPage is deprecated. Please use WA.nav.goToPage instead');
        nav.goToPage(url);
    },

    /**
     * @deprecated Use WA.nav.goToRoom instead
     */
    goToRoom(url: string): void {
        console.log('Method WA.goToRoom is deprecated. Please use WA.nav.goToRoom instead');
        nav.goToRoom(url);
    },

    /**
     * @deprecated Use WA.nav.openCoWebSite instead
     */
    openCoWebSite(url : string) : void{
        console.log('Method WA.openCoWebSite is deprecated. Please use WA.nav.openCoWebSite instead');
        nav.openCoWebSite(url);
    },

    /**
     * @deprecated Use WA.nav.closeCoWebSite instead
     */
    closeCoWebSite(): void {
        console.log('Method WA.closeCoWebSite is deprecated. Please use WA.nav.closeCoWebSite instead');
        nav.closeCoWebSite();
    },

    /**
     * @deprecated Use WA.controls.restorePlayerControls instead
     */
    openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup {
        console.log('Method WA.openPopup is deprecated. Please use WA.ui.openPopup instead');
        return ui.openPopup(targetObject, message, buttons);
    },
    /**
     * @deprecated Use WA.chat.onChatMessage instead
     */
    onChatMessage(callback: (message: string) => void): void {
        console.log('Method WA.onChatMessage is deprecated. Please use WA.chat.onChatMessage instead');
        chat.onChatMessage(callback);
    },
    /**
     * @deprecated Use WA.room.onEnterZone instead
     */
    onEnterZone(name: string, callback: () => void): void {
        console.log('Method WA.onEnterZone is deprecated. Please use WA.room.onEnterZone instead');
        room.onEnterZone(name, callback);
    },
    /**
     * @deprecated Use WA.room.onLeaveZone instead
     */
    onLeaveZone(name: string, callback: () => void): void {
        console.log('Method WA.onLeaveZone is deprecated. Please use WA.room.onLeaveZone instead');
        room.onLeaveZone(name, callback);
    },
};

export type WorkAdventureApi = typeof wa;

declare global {

    interface Window {
        WA: WorkAdventureApi
    }
    let WA: WorkAdventureApi
}

window.WA = wa;

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
