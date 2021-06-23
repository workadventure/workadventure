
import type { GameStateEvent } from './GameStateEvent';
import type { ButtonClickedEvent } from './ButtonClickedEvent';
import type { ChatEvent } from './ChatEvent';
import type { ClosePopupEvent } from './ClosePopupEvent';
import type { EnterLeaveEvent } from './EnterLeaveEvent';
import type { GoToPageEvent } from './GoToPageEvent';
import type { LoadPageEvent } from './LoadPageEvent';
import type { OpenCoWebSiteEvent } from './OpenCoWebSiteEvent';
import type { OpenPopupEvent } from './OpenPopupEvent';
import type { OpenTabEvent } from './OpenTabEvent';
import type { UserInputChatEvent } from './UserInputChatEvent';
import type { DataLayerEvent } from "./DataLayerEvent";
import type { LayerEvent } from './LayerEvent';
import type { SetPropertyEvent } from "./setPropertyEvent";
import type { LoadSoundEvent } from "./LoadSoundEvent";
import type { PlaySoundEvent } from "./PlaySoundEvent";
import type { MenuItemClickedEvent } from "./ui/MenuItemClickedEvent";
import type { MenuItemRegisterEvent } from './ui/MenuItemRegisterEvent';
import type { HasPlayerMovedEvent } from "./HasPlayerMovedEvent";


export interface TypedMessageEvent<T> extends MessageEvent {
    data: T
}

export type IframeEventMap = {
    //getState: GameStateEvent,
    // updateTile: UpdateTileEvent
    loadPage: LoadPageEvent
    chat: ChatEvent,
    openPopup: OpenPopupEvent
    closePopup: ClosePopupEvent
    openTab: OpenTabEvent
    goToPage: GoToPageEvent
    openCoWebSite: OpenCoWebSiteEvent
    closeCoWebSite: null
    disablePlayerControls: null
    restorePlayerControls: null
    displayBubble: null
    removeBubble: null
    onPlayerMove: undefined
    showLayer: LayerEvent
    hideLayer: LayerEvent
    setProperty: SetPropertyEvent
    getDataLayer: undefined
    loadSound: LoadSoundEvent
    playSound: PlaySoundEvent
    stopSound: null,
    getState: undefined,
    registerMenuCommand: MenuItemRegisterEvent
}
export interface IframeEvent<T extends keyof IframeEventMap> {
    type: T;
    data: IframeEventMap[T];
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeEventWrapper = (event: any): event is IframeEvent<keyof IframeEventMap> => typeof event.type === 'string';

export interface IframeResponseEventMap {
    userInputChat: UserInputChatEvent
    enterEvent: EnterLeaveEvent
    leaveEvent: EnterLeaveEvent
    buttonClickedEvent: ButtonClickedEvent
    gameState: GameStateEvent
    hasPlayerMoved: HasPlayerMovedEvent
    dataLayer: DataLayerEvent
    menuItemClicked: MenuItemClickedEvent
}
export interface IframeResponseEvent<T extends keyof IframeResponseEventMap> {
    type: T;
    data: IframeResponseEventMap[T];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeResponseEventWrapper = (event: { type?: string }): event is IframeResponseEvent<keyof IframeResponseEventMap> => typeof event.type === 'string';
