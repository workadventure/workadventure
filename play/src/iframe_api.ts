import { registeredCallbacks } from "./front/Api/Iframe/registeredCallbacks";
import {
    isIframeAnswerEvent,
    isIframeErrorAnswerEvent,
    isIframeResponseEvent,
    isLookingLikeIframeEventWrapper,
} from "./front/Api/Events/IframeEvent";
import type { TypedMessageEvent } from "./front/Api/Events/IframeEvent";
import chat from "./front/Api/Iframe/chat";
import type { CoWebsite } from "./front/Api/Iframe/nav";
import nav from "./front/Api/Iframe/nav";
import controls from "./front/Api/Iframe/controls";
import ui from "./front/Api/Iframe/ui";
import sound from "./front/Api/Iframe/sound";
import event from "./front/Api/Iframe/event";
import room, { setHashParameters, setMapURL, setRoomId } from "./front/Api/Iframe/room";
import { createState } from "./front/Api/Iframe/state";
import player, {
    setPlayerName,
    setPlayerLanguage,
    setTags,
    setUserRoomToken,
    setUuid,
    setIsLogged,
    setPlayerId,
} from "./front/Api/Iframe/player";
import players from "./front/Api/Iframe/players";
import type { ButtonDescriptor } from "./front/Api/Iframe/Ui/ButtonDescriptor";
import type { Popup } from "./front/Api/Iframe/Ui/Popup";
import type { Sound } from "./front/Api/Iframe/Sound/Sound";
import { answerPromises, queryWorkadventure } from "./front/Api/Iframe/IframeApiContribution";
import camera from "./front/Api/Iframe/camera";
import mapEditor from "./front/Api/Iframe/mapEditor";
export type {
    CreateUIWebsiteEvent,
    ModifyUIWebsiteEvent,
    UIWebsiteEvent,
    UIWebsiteCSSValue,
    UIWebsiteMargin,
    UIWebsitePosition,
    UIWebsiteSize,
    ViewportPositionHorizontal,
    ViewportPositionVertical,
} from "./front/Api/Events/Ui/UIWebsiteEvent";
export type {
    CreateEmbeddedWebsiteEvent,
    ModifyEmbeddedWebsiteEvent,
    Rectangle,
} from "./front/Api/Events/EmbeddedWebsiteEvent";
export type { HasPlayerMovedEvent } from "./front/Api/Events/HasPlayerMovedEvent";
export type { UIWebsite } from "./front/Api/Iframe/Ui/UIWebsite";
export type { Menu } from "./front/Api/Iframe/Ui/Menu";
export type { ActionMessage } from "./front/Api/Iframe/Ui/ActionMessage";
export type { Position } from "./front/Api/Iframe/player";
export type { EmbeddedWebsite } from "./front/Api/Iframe/Room/EmbeddedWebsite";
export type { Area } from "./front/Api/Iframe/Area/Area";
export type { ActionsMenuAction } from "./front/Api/Iframe/ui";
export type { TileDescriptor } from "./front/Api/Iframe/room";
export type { ScriptingEvent } from "./front/Api/Iframe/AbstractEvent";
export type { RemotePlayerInterface } from "./front/Api/Iframe/Players/RemotePlayer";
export type {
    SendChatMessageOptions,
    SendLocalChatMessageOptions,
    SendBubbleChatMessageOptions,
} from "../../libs/shared-utils/src/Events/ChatEvent";
export type { RoomState } from "./front/Api/Iframe/RoomState";
export type { PrivatePlayerState } from "./front/Api/Iframe/PrivatePlayerState";
export type { PublicPlayerState } from "./front/Api/Iframe/PublicPlayerState";

const globalState = createState();

let _metadata: unknown;
let _iframeId: string | undefined;

const setMetadata = (data: unknown) => {
    _metadata = data;
};

const setIframeId = (data: string | undefined) => {
    _iframeId = data;
};

// Notify WorkAdventure that we are ready to receive data
const initPromise = queryWorkadventure({
    type: "getState",
    data: undefined,
}).then((gameState) => {
    setPlayerId(gameState.playerId);
    setPlayerName(gameState.nickname);
    setPlayerLanguage(gameState.language);
    setRoomId(gameState.roomId);
    setHashParameters(gameState.hashParameters);
    setMapURL(gameState.mapUrl);
    setTags(gameState.tags);
    setUuid(gameState.uuid);
    setUserRoomToken(gameState.userRoomToken);
    setMetadata(gameState.metadata);
    setIframeId(gameState.iframeId);
    globalState.initVariables(gameState.variables as Map<string, unknown>);
    player.state.initVariables(gameState.playerVariables as Map<string, unknown>);
    setIsLogged(gameState.isLogged);
});

const wa = {
    ui,
    nav,
    controls,
    chat,
    sound,
    room,
    player,
    players,
    camera,
    state: globalState,
    event,
    mapEditor,

    /**
     * When your script / iFrame loads WorkAdventure, it takes a few milliseconds for your
     * script / iFrame to exchange data with WorkAdventure. You should wait for the WorkAdventure
     * API to be fully ready using the WA.onInit() method.
     * {@link https://docs.workadventu.re/map-building/api-start.md#waiting-for-workadventure-api-to-be-available | Website documentation}
     *
     * Some properties (like the current username, or the room ID) are not available until WA.onInit has completed.
     *
     * @returns {void}
     */
    onInit(): Promise<void> {
        return initPromise;
    },

    /**
     * The metadata sent by the administration website.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-metadata.md | Website documentation}
     *
     * @returns {unknown} Metadata
     */
    get metadata(): unknown {
        return _metadata;
    },

    /**
     * The iframeId (only set if the code is executed from a UIWebsite iframe)
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-ui.md#get-ui-website-by-id | Website documentation}
     *
     * @returns {string|undefined} IframeId
     */
    get iframeId(): string | undefined {
        return _iframeId;
    },

    // All methods below are deprecated and should not be used anymore.
    // They are kept here for backward compatibility.

    /**
     * @deprecated Use WA.chat.sendChatMessage instead
     */
    sendChatMessage(message: string, author: string): void {
        console.warn("Method WA.sendChatMessage is deprecated. Please use WA.chat.sendChatMessage instead");
        chat.sendChatMessage(message, author);
    },

    /**
     * @deprecated Use WA.chat.disablePlayerControls instead
     */
    disablePlayerControls(): void {
        console.warn(
            "Method WA.disablePlayerControls is deprecated. Please use WA.controls.disablePlayerControls instead"
        );
        controls.disablePlayerControls();
    },

    /**
     * @deprecated Use WA.controls.restorePlayerControls instead
     */
    restorePlayerControls(): void {
        console.warn(
            "Method WA.restorePlayerControls is deprecated. Please use WA.controls.restorePlayerControls instead"
        );
        controls.restorePlayerControls();
    },

    /**
     * @deprecated Use WA.ui.displayBubble instead
     */
    displayBubble(): void {
        console.warn("Method WA.displayBubble is deprecated. Please use WA.ui.displayBubble instead");
        ui.displayBubble();
    },

    /**
     * @deprecated Use WA.ui.removeBubble instead
     */
    removeBubble(): void {
        console.warn("Method WA.removeBubble is deprecated. Please use WA.ui.removeBubble instead");
        ui.removeBubble();
    },

    /**
     * @deprecated Use WA.nav.openTab instead
     */
    openTab(url: string): void {
        console.warn("Method WA.openTab is deprecated. Please use WA.nav.openTab instead");
        nav.openTab(url);
    },

    /**
     * @deprecated Use WA.sound.loadSound instead
     */
    loadSound(url: string): Sound {
        console.warn("Method WA.loadSound is deprecated. Please use WA.sound.loadSound instead");
        return sound.loadSound(url);
    },

    /**
     * @deprecated Use WA.nav.goToPage instead
     */
    goToPage(url: string): void {
        console.warn("Method WA.goToPage is deprecated. Please use WA.nav.goToPage instead");
        nav.goToPage(url);
    },

    /**
     * @deprecated Use WA.nav.goToRoom instead
     */
    goToRoom(url: string): void {
        console.warn("Method WA.goToRoom is deprecated. Please use WA.nav.goToRoom instead");
        nav.goToRoom(url);
    },

    /**
     * @deprecated Use WA.nav.openCoWebSite instead
     */
    openCoWebSite(url: string, allowApi = false, allowPolicy = ""): Promise<CoWebsite> {
        console.warn("Method WA.openCoWebSite is deprecated. Please use WA.nav.openCoWebSite instead");
        return nav.openCoWebSite(url, allowApi, allowPolicy);
    },

    /**
     * @deprecated Use WA.nav.closeCoWebSite instead
     */
    closeCoWebSite(): Promise<void> {
        console.warn("Method WA.closeCoWebSite is deprecated. Please use WA.nav.closeCoWebSite instead");
        return nav.closeCoWebSite();
    },

    /**
     * @deprecated Use WA.ui.openPopup instead
     */
    openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup {
        console.warn("Method WA.openPopup is deprecated. Please use WA.ui.openPopup instead");
        return ui.openPopup(targetObject, message, buttons);
    },
    /**
     * @deprecated Use WA.chat.onChatMessage instead
     */
    onChatMessage(callback: (message: string) => void): void {
        console.warn("Method WA.onChatMessage is deprecated. Please use WA.chat.onChatMessage instead");
        chat.onChatMessage(callback);
    },
    /**
     * @deprecated Use WA.room.onEnterZone instead
     */
    onEnterZone(name: string, callback: () => void): void {
        console.warn("Method WA.onEnterZone is deprecated. Please use WA.room.onEnterZone instead");
        room.onEnterZone(name, callback);
    },
    /**
     * @deprecated Use WA.room.onLeaveZone instead
     */
    onLeaveZone(name: string, callback: () => void): void {
        console.warn("Method WA.onLeaveZone is deprecated. Please use WA.room.onLeaveZone instead");
        room.onLeaveZone(name, callback);
    },
};

export type WorkAdventureApi = typeof wa;
export type { Sound, Popup, ButtonDescriptor, CoWebsite };

declare global {
    interface Window {
        WA: WorkAdventureApi;
    }
    let WA: WorkAdventureApi;
}

window.WA = wa;

window.addEventListener("message", (message: TypedMessageEvent<unknown>) => {
    if (message.source !== window.parent) {
        return; // Skip message in this event listener
    }
    const payload = message.data;

    //console.debug(payload);

    const safeParseErrorAnswerEvent = isIframeErrorAnswerEvent.safeParse(payload);
    if (safeParseErrorAnswerEvent.success) {
        const payloadData = safeParseErrorAnswerEvent.data;
        const queryId = payloadData.id;
        const payloadError = payloadData.error;

        const resolver = answerPromises.get(queryId);
        if (resolver === undefined) {
            throw new Error("In Iframe API, got an error answer for a question that we have no track of.");
        }
        resolver.reject(new Error(payloadError));

        answerPromises.delete(queryId);
    } else if (isIframeAnswerEvent(payload)) {
        const queryId = payload.id;
        const payloadData = payload.data;

        const resolver = answerPromises.get(queryId);
        if (resolver === undefined) {
            throw new Error("In Iframe API, got an answer for a question that we have no track of.");
        }
        resolver.resolve(payloadData);

        answerPromises.delete(queryId);
    } else {
        const safeParsedPayload = isIframeResponseEvent.safeParse(payload);
        if (safeParsedPayload.success) {
            const payloadData = safeParsedPayload.data;

            const callbacks = registeredCallbacks[payloadData.type];
            if (callbacks === undefined) {
                throw new Error('Missing event handler for event of type "' + payloadData.type + "'");
            }
            for (const callback of callbacks) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                callback?.(payloadData.data);
            }
        } else {
            const safeLooksLikeResponse = isLookingLikeIframeEventWrapper.safeParse(payload);
            if (safeLooksLikeResponse.success) {
                throw new Error(
                    "Could not parse message received from WorkAdventure. Message:" + JSON.stringify(payload)
                );
            }
        }
    }
});
