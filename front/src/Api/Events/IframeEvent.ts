import * as tg from "generic-type-guard";
import type { ButtonClickedEvent } from "./ButtonClickedEvent";
import type { ChatEvent } from "./ChatEvent";
import type { ClosePopupEvent } from "./ClosePopupEvent";
import type { EnterLeaveEvent } from "./EnterLeaveEvent";
import type { GoToPageEvent } from "./GoToPageEvent";
import type { LoadPageEvent } from "./LoadPageEvent";
import { isCoWebsite, isOpenCoWebsiteEvent } from "./OpenCoWebsiteEvent";
import type { OpenPopupEvent } from "./OpenPopupEvent";
import type { OpenTabEvent } from "./OpenTabEvent";
import type { UserInputChatEvent } from "./UserInputChatEvent";
import type { LayerEvent } from "./LayerEvent";
import type { SetPropertyEvent } from "./setPropertyEvent";
import type { LoadSoundEvent } from "./LoadSoundEvent";
import type { PlaySoundEvent } from "./PlaySoundEvent";
import type { MenuItemClickedEvent } from "./ui/MenuItemClickedEvent";
import type { HasPlayerMovedEvent } from "./HasPlayerMovedEvent";
import type { SetTilesEvent } from "./SetTilesEvent";
import type { SetVariableEvent } from "./SetVariableEvent";
import { isGameStateEvent } from "./GameStateEvent";
import { isMapDataEvent } from "./MapDataEvent";
import { isSetVariableEvent } from "./SetVariableEvent";
import type { EmbeddedWebsite } from "../iframe/Room/EmbeddedWebsite";
import { isCreateEmbeddedWebsiteEvent } from "./EmbeddedWebsiteEvent";
import type { LoadTilesetEvent } from "./LoadTilesetEvent";
import { isLoadTilesetEvent } from "./LoadTilesetEvent";
import type { MessageReferenceEvent } from "./ui/TriggerActionMessageEvent";
import { isMessageReferenceEvent, isTriggerActionMessageEvent } from "./ui/TriggerActionMessageEvent";
import type { MenuRegisterEvent, UnregisterMenuEvent } from "./ui/MenuRegisterEvent";
import type { ChangeLayerEvent } from "./ChangeLayerEvent";
import { isPlayerPosition } from "./PlayerPosition";
import type { WasCameraUpdatedEvent } from "./WasCameraUpdatedEvent";
import type { ChangeZoneEvent } from "./ChangeZoneEvent";
import type { CameraSetEvent } from "./CameraSetEvent";
import type { CameraFollowPlayerEvent } from "./CameraFollowPlayerEvent";
import { isColorEvent } from "./ColorEvent";
import { isMovePlayerToEventConfig } from "./MovePlayerToEvent";
import { isMovePlayerToEventAnswer } from "./MovePlayerToEventAnswer";

export interface TypedMessageEvent<T> extends MessageEvent {
    data: T;
}

/**
 * List event types sent from an iFrame to WorkAdventure
 */
export type IframeEventMap = {
    loadPage: LoadPageEvent;
    chat: ChatEvent;
    cameraFollowPlayer: CameraFollowPlayerEvent;
    cameraSet: CameraSetEvent;
    openPopup: OpenPopupEvent;
    closePopup: ClosePopupEvent;
    openTab: OpenTabEvent;
    goToPage: GoToPageEvent;
    disablePlayerControls: null;
    restorePlayerControls: null;
    displayBubble: null;
    removeBubble: null;
    onPlayerMove: undefined;
    onCameraUpdate: undefined;
    showLayer: LayerEvent;
    hideLayer: LayerEvent;
    setProperty: SetPropertyEvent;
    loadSound: LoadSoundEvent;
    playSound: PlaySoundEvent;
    stopSound: null;
    getState: undefined;
    loadTileset: LoadTilesetEvent;
    registerMenu: MenuRegisterEvent;
    unregisterMenu: UnregisterMenuEvent;
    setTiles: SetTilesEvent;
    modifyEmbeddedWebsite: Partial<EmbeddedWebsite>; // Note: name should be compulsory in fact
};
export interface IframeEvent<T extends keyof IframeEventMap> {
    type: T;
    data: IframeEventMap[T];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeEventWrapper = (event: any): event is IframeEvent<keyof IframeEventMap> =>
    typeof event.type === "string";

export interface IframeResponseEventMap {
    userInputChat: UserInputChatEvent;
    enterEvent: EnterLeaveEvent;
    leaveEvent: EnterLeaveEvent;
    enterLayerEvent: ChangeLayerEvent;
    leaveLayerEvent: ChangeLayerEvent;
    enterZoneEvent: ChangeZoneEvent;
    leaveZoneEvent: ChangeZoneEvent;
    buttonClickedEvent: ButtonClickedEvent;
    hasPlayerMoved: HasPlayerMovedEvent;
    wasCameraUpdated: WasCameraUpdatedEvent;
    menuItemClicked: MenuItemClickedEvent;
    setVariable: SetVariableEvent;
    messageTriggered: MessageReferenceEvent;
}
export interface IframeResponseEvent<T extends keyof IframeResponseEventMap> {
    type: T;
    data: IframeResponseEventMap[T];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeResponseEventWrapper = (event: {
    type?: string;
}): event is IframeResponseEvent<keyof IframeResponseEventMap> => typeof event.type === "string";

/**
 * List event types sent from an iFrame to WorkAdventure that expect a unique answer from WorkAdventure along the type for the answer from WorkAdventure to the iFrame.
 * Types are defined using Type guards that will actually bused to enforce and check types.
 */
export const iframeQueryMapTypeGuards = {
    getState: {
        query: tg.isUndefined,
        answer: isGameStateEvent,
    },
    getMapData: {
        query: tg.isUndefined,
        answer: isMapDataEvent,
    },
    setVariable: {
        query: isSetVariableEvent,
        answer: tg.isUndefined,
    },
    loadTileset: {
        query: isLoadTilesetEvent,
        answer: tg.isNumber,
    },
    openCoWebsite: {
        query: isOpenCoWebsiteEvent,
        answer: isCoWebsite,
    },
    getCoWebsites: {
        query: tg.isUndefined,
        answer: tg.isArray(isCoWebsite),
    },
    closeCoWebsite: {
        query: tg.isString,
        answer: tg.isUndefined,
    },
    closeCoWebsites: {
        query: tg.isUndefined,
        answer: tg.isUndefined,
    },
    triggerActionMessage: {
        query: isTriggerActionMessageEvent,
        answer: tg.isUndefined,
    },
    removeActionMessage: {
        query: isMessageReferenceEvent,
        answer: tg.isUndefined,
    },
    getEmbeddedWebsite: {
        query: tg.isString,
        answer: isCreateEmbeddedWebsiteEvent,
    },
    deleteEmbeddedWebsite: {
        query: tg.isString,
        answer: tg.isUndefined,
    },
    createEmbeddedWebsite: {
        query: isCreateEmbeddedWebsiteEvent,
        answer: tg.isUndefined,
    },
    setPlayerOutline: {
        query: isColorEvent,
        answer: tg.isUndefined,
    },
    removePlayerOutline: {
        query: tg.isUndefined,
        answer: tg.isUndefined,
    },
    getPlayerPosition: {
        query: tg.isUndefined,
        answer: isPlayerPosition,
    },
    movePlayerTo: {
        query: isMovePlayerToEventConfig,
        answer: isMovePlayerToEventAnswer,
    },
};

type GuardedType<T> = T extends (x: unknown) => x is infer T ? T : never;
type IframeQueryMapTypeGuardsType = typeof iframeQueryMapTypeGuards;
type UnknownToVoid<T> = undefined extends T ? void : T;

export type IframeQueryMap = {
    [key in keyof IframeQueryMapTypeGuardsType]: {
        query: GuardedType<IframeQueryMapTypeGuardsType[key]["query"]>;
        answer: UnknownToVoid<GuardedType<IframeQueryMapTypeGuardsType[key]["answer"]>>;
    };
};

export interface IframeQuery<T extends keyof IframeQueryMap> {
    type: T;
    data: IframeQueryMap[T]["query"];
}

export interface IframeQueryWrapper<T extends keyof IframeQueryMap> {
    id: number;
    query: IframeQuery<T>;
}

export const isIframeQueryKey = (type: string): type is keyof IframeQueryMap => {
    return type in iframeQueryMapTypeGuards;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeQuery = (event: any): event is IframeQuery<keyof IframeQueryMap> => {
    const type = event.type;
    if (typeof type !== "string") {
        return false;
    }
    if (!isIframeQueryKey(type)) {
        return false;
    }

    const result = iframeQueryMapTypeGuards[type].query(event.data);
    if (!result) {
        console.warn('Received a query with type "' + type + '" but the payload is invalid.');
    }
    return result;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeQueryWrapper = (event: any): event is IframeQueryWrapper<keyof IframeQueryMap> =>
    typeof event.id === "number" && isIframeQuery(event.query);

export interface IframeAnswerEvent<T extends keyof IframeQueryMap> {
    id: number;
    type: T;
    data: IframeQueryMap[T]["answer"];
}

export const isIframeAnswerEvent = (event: {
    type?: string;
    id?: number;
}): event is IframeAnswerEvent<keyof IframeQueryMap> => typeof event.type === "string" && typeof event.id === "number";

export interface IframeErrorAnswerEvent {
    id: number;
    type: keyof IframeQueryMap;
    error: string;
}

export const isIframeErrorAnswerEvent = (event: {
    type?: string;
    id?: number;
    error?: string;
}): event is IframeErrorAnswerEvent =>
    typeof event.type === "string" && typeof event.id === "number" && typeof event.error === "string";
