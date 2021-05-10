

import { ButtonClickedEvent } from './ButtonClickedEvent';
import { ChatEvent } from './ChatEvent';
import { ClosePopupEvent } from './ClosePopupEvent';
import { EnterLeaveEvent } from './EnterLeaveEvent';
import { GoToPageEvent } from './GoToPageEvent';
import { OpenCoWebSiteEvent } from './OpenCoWebSiteEvent';
import { OpenPopupEvent } from './OpenPopupEvent';
import { OpenTabEvent } from './OpenTabEvent';
import { UserInputChatEvent } from './UserInputChatEvent';
import { LayerEvent } from './LayerEvent';


export interface TypedMessageEvent<T> extends MessageEvent {
    data: T
}

export type IframeEventMap = {
    //getState: GameStateEvent,
    // updateTile: UpdateTileEvent
    chat: ChatEvent,
    openPopup: OpenPopupEvent
    closePopup: ClosePopupEvent
    openTab: OpenTabEvent
    goToPage: GoToPageEvent
    openCoWebSite: OpenCoWebSiteEvent
    closeCoWebSite: null
    disablePlayerControl: null
    restorePlayerControl: null
    displayBubble: null
    removeBubble: null
    showLayer: LayerEvent
    hideLayer: LayerEvent
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
    // gameState: GameStateEvent
}
export interface IframeResponseEvent<T extends keyof IframeResponseEventMap> {
    type: T;
    data: IframeResponseEventMap[T];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeResponseEventWrapper = (event: { type?: string }): event is IframeResponseEvent<keyof IframeResponseEventMap> => typeof event.type === 'string';