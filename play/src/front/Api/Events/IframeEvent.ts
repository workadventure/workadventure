import { z } from "zod";
import {
    isBanEvent,
    isChatEvent,
    isChatMessage,
    isKlaxoonEvent,
    KLAXOON_ACTIVITY_PICKER_EVENT,
} from "@workadventure/shared-utils";
import { isStartWritingEvent, isStopWritingEvent } from "@workadventure/shared-utils/src/Events/WritingEvent";
import { isUpdateWritingStatusChatListEvent } from "@workadventure/shared-utils/src/Events/UpdateWritingStatusChatListEvent";
import { isClosePopupEvent } from "./ClosePopupEvent";
import { isGoToPageEvent } from "./GoToPageEvent";
import { isLoadPageEvent } from "./LoadPageEvent";
import { isCoWebsite, isOpenCoWebsiteEvent } from "./OpenCoWebsiteEvent";
import { isOpenPopupEvent } from "./OpenPopupEvent";
import { isOpenTabEvent } from "./OpenTabEvent";
import { isLayerEvent } from "./LayerEvent";
import { isSetPropertyEvent } from "./SetPropertyEvent";
import { isLoadSoundEvent } from "./LoadSoundEvent";
import { isPlaySoundEvent } from "./PlaySoundEvent";
import { isStopSoundEvent } from "./StopSoundEvent";
import { isSetTilesEvent } from "./SetTilesEvent";
import { isGameStateEvent } from "./GameStateEvent";
import { isMapDataEvent } from "./MapDataEvent";
import { isSetVariableEvent } from "./SetVariableEvent";
import { isCreateEmbeddedWebsiteEvent, isEmbeddedWebsiteEvent } from "./EmbeddedWebsiteEvent";
import { isLoadTilesetEvent } from "./LoadTilesetEvent";
import { isMessageReferenceEvent, isTriggerActionMessageEvent } from "./Ui/TriggerActionMessageEvent";
import { isMenuRegisterEvent, isOpenMenuEvent, isUnregisterMenuEvent } from "./Ui/MenuEvents";
import { isPlayerPosition } from "./PlayerPosition";
import { isCameraSetEvent } from "./CameraSetEvent";
import { isCameraFollowPlayerEvent } from "./CameraFollowPlayerEvent";
import { isColorEvent } from "./ColorEvent";
import { isMovePlayerToEventConfig } from "./MovePlayerToEvent";
import { isMovePlayerToEventAnswer } from "./MovePlayerToEventAnswer";
import { isAddActionsMenuKeyToRemotePlayerEvent } from "./AddActionsMenuKeyToRemotePlayerEvent";
import { isRemoveActionsMenuKeyFromRemotePlayerEvent } from "./RemoveActionsMenuKeyFromRemotePlayerEvent";
import { isSetAreaPropertyEvent } from "./SetAreaPropertyEvent";
import { isCreateUIWebsiteEvent, isModifyUIWebsiteEvent, isUIWebsiteEvent } from "./Ui/UIWebsiteEvent";
import { isCreateDynamicAreaEvent, isDynamicAreaEvent } from "./CreateDynamicAreaEvent";
import { isUserInputChatEvent } from "./UserInputChatEvent";
import { isEnterLeaveEvent } from "./EnterLeaveEvent";
import { isChangeLayerEvent } from "./ChangeLayerEvent";
import { isChangeAreaEvent } from "./ChangeAreaEvent";
import { isButtonClickedEvent } from "./ButtonClickedEvent";
import { isActionsMenuActionClickedEvent } from "./ActionsMenuActionClickedEvent";
import { isHasPlayerMovedEvent } from "./HasPlayerMovedEvent";
import { isWasCameraUpdatedEvent } from "./WasCameraUpdatedEvent";
import { isAskPositionEvent } from "./AskPositionEvent";
import { isLeaveMucEvent } from "./LeaveMucEvent";
import { isJoinMucEvent } from "./JoinMucEvent";
import { isMenuItemClickedEvent } from "./Ui/MenuItemClickedEvent";
import { isJoinProximityMeetingEvent } from "./ProximityMeeting/JoinProximityMeetingEvent";
import { isParticipantProximityMeetingEvent } from "./ProximityMeeting/ParticipantProximityMeetingEvent";
import { isSetSharedPlayerVariableEvent } from "./SetSharedPlayerVariableEvent";
import { isEnablePlayersTrackingEvent } from "./EnablePlayersTrackingEvent";
import { isAddPlayerEvent, isRemotePlayerChangedEvent } from "./AddPlayerEvent";
import { isSetPlayerVariableEvent } from "./SetPlayerVariableEvent";
import { isSettingsEvent } from "./SettingsEvent";
import { isChatVisibilityEvent } from "./ChatVisibilityEvent";
import { isShowBusinessCardEvent } from "./ShowBusinessCardEvent";
import { isModalEvent } from "./ModalEvent";
import { isAddActionBarButtonEvent, isRemoveButtonActionBarEvent } from "./Ui/ButtonActionBarEvent";
import { isBannerEvent } from "./Ui/BannerEvent";
import { isTeleportPlayerToEventConfig } from "./TeleportPlayerToEvent";
import { isSendEventEvent } from "./SendEventEvent";
import { isReceiveEventEvent } from "./ReceiveEventEvent";
import { isPlaySoundInBubbleEvent } from "./ProximityMeeting/PlaySoundInBubbleEvent";
import { isStartStreamInBubbleEvent } from "./ProximityMeeting/StartStreamInBubbleEvent";
import { isAppendPCMDataEvent } from "./ProximityMeeting/AppendPCMDataEvent";
import { isWamMapDataEvent } from "./WamMapDataEvent";
import { isPlayVideoEvent } from "./Ui/PlayVideoEvent";

export interface TypedMessageEvent<T> extends MessageEvent {
    data: T;
}

/**
 * List event types sent from an iFrame to WorkAdventure
 */
export const isIframeEventWrapper = z.union([
    z.object({
        type: z.literal("addActionsMenuKeyToRemotePlayer"),
        data: isAddActionsMenuKeyToRemotePlayerEvent,
    }),
    z.object({
        type: z.literal("removeActionsMenuKeyFromRemotePlayer"),
        data: isRemoveActionsMenuKeyFromRemotePlayerEvent,
    }),
    z.object({
        type: z.literal("loadPage"),
        data: isLoadPageEvent,
    }),
    z.object({
        type: z.literal("chat"),
        data: isChatEvent,
    }),
    z.object({
        type: z.literal("startWriting"),
        data: isStartWritingEvent,
    }),
    z.object({
        type: z.literal("stopWriting"),
        data: isStopWritingEvent,
    }),
    z.object({
        type: z.literal("openChat"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("closeChat"),
        data: z.undefined(),
    }),
    /* @deprecated with new service chat messagerie */
    z.object({
        type: z.literal("addPersonnalMessage"),
        data: z.string(),
    }),
    z.object({
        type: z.literal("newChatMessageWritingStatus"),
        data: z.number(),
    }),
    z.object({
        type: z.literal("cameraFollowPlayer"),
        data: isCameraFollowPlayerEvent,
    }),
    z.object({
        type: z.literal("cameraSet"),
        data: isCameraSetEvent,
    }),
    z.object({
        type: z.literal("openPopup"),
        data: isOpenPopupEvent,
    }),
    z.object({
        type: z.literal("closePopup"),
        data: isClosePopupEvent,
    }),
    z.object({
        type: z.literal("openTab"),
        data: isOpenTabEvent,
    }),
    z.object({
        type: z.literal("goToPage"),
        data: isGoToPageEvent,
    }),
    z.object({
        type: z.literal("turnOffMicrophone"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("turnOffWebcam"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disableMicrophone"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restoreMicrophone"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disableWebcam"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restoreWebcam"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disablePlayerControls"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restorePlayerControls"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disablePlayerProximityMeeting"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restorePlayerProximityMeeting"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("displayBubble"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("removeBubble"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("onPlayerMove"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("onCameraUpdate"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("showLayer"),
        data: isLayerEvent,
    }),
    z.object({
        type: z.literal("hideLayer"),
        data: isLayerEvent,
    }),
    z.object({
        type: z.literal("setProperty"),
        data: isSetPropertyEvent,
    }),
    z.object({
        type: z.literal("setAreaProperty"),
        data: isSetAreaPropertyEvent,
    }),
    z.object({
        type: z.literal("loadSound"),
        data: isLoadSoundEvent,
    }),
    z.object({
        type: z.literal("playSound"),
        data: isPlaySoundEvent,
    }),
    z.object({
        type: z.literal("stopSound"),
        data: isStopSoundEvent,
    }),
    z.object({
        type: z.literal("registerMenu"),
        data: isMenuRegisterEvent,
    }),
    z.object({
        type: z.literal("unregisterMenu"),
        data: isUnregisterMenuEvent,
    }),
    z.object({
        type: z.literal("openMenu"),
        data: isOpenMenuEvent,
    }),
    z.object({
        type: z.literal("setTiles"),
        data: isSetTilesEvent,
    }),
    z.object({
        type: z.literal("modifyEmbeddedWebsite"),
        data: isEmbeddedWebsiteEvent,
    }),
    z.object({
        type: z.literal("modifyUIWebsite"),
        data: isModifyUIWebsiteEvent,
    }),
    z.object({
        type: z.literal("modifyArea"),
        data: isDynamicAreaEvent,
    }),
    z.object({
        type: z.literal("askPosition"),
        data: isAskPositionEvent,
    }),
    z.object({
        type: z.literal("openInviteMenu"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("login"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("refresh"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("showBusinessCard"),
        data: isShowBusinessCardEvent,
    }),
    z.object({
        type: z.literal("openModal"),
        data: isModalEvent,
    }),
    z.object({
        type: z.literal("closeModal"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("redirectPricing"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("addButtonActionBar"),
        data: isAddActionBarButtonEvent,
    }),
    z.object({
        type: z.literal("removeButtonActionBar"),
        data: isRemoveButtonActionBarEvent,
    }),
    z.object({
        type: z.literal("openBanner"),
        data: isBannerEvent,
    }),
    z.object({
        type: z.literal("closeBanner"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal(KLAXOON_ACTIVITY_PICKER_EVENT),
        payload: isKlaxoonEvent,
    }),
    z.object({
        type: z.literal("banUser"),
        data: isBanEvent,
    }),
    z.object({
        type: z.literal("disableMapEditor"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restoreMapEditor"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disableScreenSharing"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restoreScreenSharing"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disableRightClick"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restoreRightClick"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disableWheelZoom"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restoreWheelZoom"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disableInviteUserButton"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restoreInviteUserButton"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("disableRoomList"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("restoreRoomList"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("startListeningToStreamInBubble"),
        data: isStartStreamInBubbleEvent,
    }),
    z.object({
        type: z.literal("stopListeningToStreamInBubble"),
        data: z.undefined(),
    }),
]);

export type IframeEvent = z.infer<typeof isIframeEventWrapper>;

export const isIframeResponseEvent = z.union([
    z.object({
        type: z.literal("userInputChat"),
        data: isUserInputChatEvent,
    }),
    z.object({
        type: z.literal("joinProximityMeetingEvent"),
        data: isJoinProximityMeetingEvent,
    }),
    z.object({
        type: z.literal("participantJoinProximityMeetingEvent"),
        data: isParticipantProximityMeetingEvent,
    }),
    z.object({
        type: z.literal("participantLeaveProximityMeetingEvent"),
        data: isParticipantProximityMeetingEvent,
    }),
    z.object({
        type: z.literal("leaveProximityMeetingEvent"),
        data: z.undefined(),
    }),
    z.object({
        type: z.literal("onFollowed"),
        data: isParticipantProximityMeetingEvent,
    }),
    z.object({
        type: z.literal("onUnfollowed"),
        data: isParticipantProximityMeetingEvent,
    }),
    z.object({
        type: z.literal("enterEvent"),
        data: isEnterLeaveEvent,
    }),
    z.object({
        type: z.literal("leaveEvent"),
        data: isEnterLeaveEvent,
    }),
    z.object({
        type: z.literal("enterMapEditorAreaEvent"),
        data: isChangeAreaEvent,
    }),
    z.object({
        type: z.literal("leaveMapEditorAreaEvent"),
        data: isChangeAreaEvent,
    }),
    z.object({
        type: z.literal("enterLayerEvent"),
        data: isChangeLayerEvent,
    }),
    z.object({
        type: z.literal("leaveLayerEvent"),
        data: isChangeLayerEvent,
    }),
    z.object({
        type: z.literal("enterAreaEvent"),
        data: isChangeAreaEvent,
    }),
    z.object({
        type: z.literal("leaveAreaEvent"),
        data: isChangeAreaEvent,
    }),
    z.object({
        type: z.literal("buttonClickedEvent"),
        data: isButtonClickedEvent,
    }),
    z.object({
        type: z.literal("remotePlayerClickedEvent"),
        data: isAddPlayerEvent,
    }),
    z.object({
        type: z.literal("actionsMenuActionClickedEvent"),
        data: isActionsMenuActionClickedEvent,
    }),
    z.object({
        type: z.literal("hasPlayerMoved"),
        data: isHasPlayerMovedEvent,
    }),
    z.object({
        type: z.literal("wasCameraUpdated"),
        data: isWasCameraUpdatedEvent,
    }),
    z.object({
        type: z.literal("menuItemClicked"),
        data: isMenuItemClickedEvent,
    }),
    z.object({
        type: z.literal("setVariable"),
        data: isSetVariableEvent,
    }),
    z.object({
        type: z.literal("setPlayerVariable"),
        data: isSetVariableEvent,
    }),
    z.object({
        type: z.literal("setSharedPlayerVariable"),
        data: isSetSharedPlayerVariableEvent,
    }),
    z.object({
        type: z.literal("receiveEvent"),
        data: isReceiveEventEvent,
    }),
    z.object({
        type: z.literal("messageTriggered"),
        data: isMessageReferenceEvent,
    }),
    z.object({
        type: z.literal("leaveMuc"),
        data: isLeaveMucEvent,
    }),
    z.object({
        type: z.literal("joinMuc"),
        data: isJoinMucEvent,
    }),
    z.object({
        type: z.literal("addRemotePlayer"),
        data: isAddPlayerEvent,
    }),
    z.object({
        type: z.literal("removeRemotePlayer"),
        data: z.number(),
    }),
    z.object({
        type: z.literal("remotePlayerChanged"),
        data: isRemotePlayerChangedEvent,
    }),
    z.object({
        type: z.literal("settings"),
        data: isSettingsEvent,
    }),
    z.object({
        type: z.literal("chatVisibility"),
        data: isChatVisibilityEvent,
    }),
    z.object({
        type: z.literal("availabilityStatus"),
        data: z.number(),
    }),

    // TODO will be deleted if timeline is becoming a MUC room
    z.object({
        type: z.literal("peerConnectionStatus"),
        data: z.boolean(),
    }),
    z.object({
        type: z.literal("comingUser"),
        data: isChatMessage,
    }),
    z.object({
        type: z.literal("addChatMessage"),
        data: isChatMessage,
    }),
    z.object({
        type: z.literal("updateWritingStatusChatList"),
        data: isUpdateWritingStatusChatListEvent,
    }),
    z.object({
        type: z.literal("buttonActionBarTriggered"),
        data: z.string(),
    }),
    z.object({
        type: z.literal("modalCloseTrigger"),
        data: isModalEvent,
    }),
    z.object({
        type: z.literal("banUser"),
        data: isBanEvent,
    }),
    z.object({
        type: z.literal("appendPCMData"),
        data: isAppendPCMDataEvent,
    }),
]);
export type IframeResponseEvent = z.infer<typeof isIframeResponseEvent>;

export const isLookingLikeIframeEventWrapper = z.object({
    type: z.string(),
    data: z.unknown().optional(),
    payload: z.unknown().optional(),
});

/**
 * List event types sent from an iFrame to WorkAdventure that expect a unique answer from WorkAdventure along the type for the answer from WorkAdventure to the iFrame.
 * Types are defined using Type guards that will actually bused to enforce and check types.
 */
export const iframeQueryMapTypeGuards = {
    getState: {
        query: z.undefined(),
        answer: isGameStateEvent,
    },
    getMapData: {
        query: z.undefined(),
        answer: isMapDataEvent,
    },
    setVariable: {
        query: isSetVariableEvent,
        answer: z.undefined(),
    },
    setPlayerVariable: {
        query: isSetPlayerVariableEvent,
        answer: z.undefined(),
    },
    dispatchEvent: {
        query: isSendEventEvent,
        answer: z.undefined(),
    },
    loadTileset: {
        query: isLoadTilesetEvent,
        answer: z.number(),
    },
    openCoWebsite: {
        query: isOpenCoWebsiteEvent,
        answer: isCoWebsite,
    },
    getCoWebsites: {
        query: z.undefined(),
        answer: z.array(isCoWebsite),
    },
    closeCoWebsite: {
        query: z.string(),
        answer: z.undefined(),
    },
    closeCoWebsites: {
        query: z.undefined(),
        answer: z.undefined(),
    },
    goToLogin: {
        query: z.undefined(),
        answer: z.undefined(),
    },
    triggerActionMessage: {
        query: isTriggerActionMessageEvent,
        answer: z.undefined(),
    },
    triggerPlayerMessage: {
        query: isTriggerActionMessageEvent,
        answer: z.undefined(),
    },
    removeActionMessage: {
        query: isMessageReferenceEvent,
        answer: z.undefined(),
    },
    removePlayerMessage: {
        query: isMessageReferenceEvent,
        answer: z.undefined(),
    },
    getEmbeddedWebsite: {
        query: z.string(),
        answer: isCreateEmbeddedWebsiteEvent,
    },
    deleteEmbeddedWebsite: {
        query: z.string(),
        answer: z.undefined(),
    },
    createEmbeddedWebsite: {
        query: isCreateEmbeddedWebsiteEvent,
        answer: z.undefined(),
    },
    createArea: {
        query: isCreateDynamicAreaEvent,
        answer: z.undefined(),
    },
    getArea: {
        query: z.string(),
        answer: isCreateDynamicAreaEvent,
    },
    modifyArea: {
        query: isDynamicAreaEvent,
        answer: z.undefined(),
    },
    deleteArea: {
        query: z.string(),
        answer: z.undefined(),
    },
    setPlayerOutline: {
        query: isColorEvent,
        answer: z.undefined(),
    },
    removePlayerOutline: {
        query: z.undefined(),
        answer: z.undefined(),
    },
    getPlayerPosition: {
        query: z.undefined(),
        answer: isPlayerPosition,
    },
    movePlayerTo: {
        query: isMovePlayerToEventConfig,
        answer: isMovePlayerToEventAnswer,
    },
    teleportPlayerTo: {
        query: isTeleportPlayerToEventConfig,
        answer: z.undefined(),
    },
    openUIWebsite: {
        query: isCreateUIWebsiteEvent,
        answer: isUIWebsiteEvent,
    },
    closeUIWebsite: {
        query: z.string(),
        answer: z.undefined(),
    },
    getUIWebsites: {
        query: z.undefined(),
        answer: z.array(isUIWebsiteEvent),
    },
    getUIWebsiteById: {
        query: z.string(),
        answer: isUIWebsiteEvent,
    },
    enablePlayersTracking: {
        query: isEnablePlayersTrackingEvent,
        answer: z.array(isAddPlayerEvent),
    },
    getWoka: {
        query: z.undefined(),
        answer: z.string(),
    },
    playSoundInBubble: {
        query: isPlaySoundInBubbleEvent,
        answer: z.undefined(),
    },
    startStreamInBubble: {
        query: isStartStreamInBubbleEvent,
        answer: z.undefined(),
    },
    stopStreamInBubble: {
        query: z.undefined(),
        answer: z.undefined(),
    },
    appendPCMData: {
        query: isAppendPCMDataEvent,
        answer: z.undefined(),
    },
    resetAudioBuffer: {
        query: z.undefined(),
        answer: z.undefined(),
    },
    followMe: {
        query: z.undefined(),
        answer: z.undefined(),
    },
    stopLeading: {
        query: z.undefined(),
        answer: z.undefined(),
    },
    getWamMapData: {
        query: z.undefined(),
        answer: isWamMapDataEvent,
    },
    playVideo: {
        query: isPlayVideoEvent,
        answer: z.string(),
    },
    stopVideo: {
        query: z.string(),
        answer: z.undefined(),
    },
};

type IframeQueryMapTypeGuardsType = typeof iframeQueryMapTypeGuards;
type UnknownToVoid<T> = undefined extends T ? void : T;

export type IframeQueryMap = {
    [key in keyof IframeQueryMapTypeGuardsType]: {
        query: z.infer<(typeof iframeQueryMapTypeGuards)[key]["query"]>;
        answer: UnknownToVoid<z.infer<(typeof iframeQueryMapTypeGuards)[key]["answer"]>>;
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

    try {
        iframeQueryMapTypeGuards[type].query.parse(event.data);
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error(err.issues);
        }
        console.warn('Received a query with type "' + type + '" but the payload is invalid.');

        return false;
    }

    return true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeQueryWrapper = (event: any): event is IframeQueryWrapper<keyof IframeQueryMap> =>
    typeof event.id === "number" && isIframeQuery(event.query);

export interface IframeAnswerEvent<T extends keyof IframeQueryMap> {
    id: number;
    type: T;
    data: IframeQueryMap[T]["answer"];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeAnswerEvent = (event: any): event is IframeAnswerEvent<keyof IframeQueryMap> =>
    typeof event.type === "string" && typeof event.id === "number";

/*export interface IframeErrorAnswerEvent {
    id: number;
    type: keyof IframeQueryMap;
    error: string;
}

export const isIframeErrorAnswerEvent = (event: {
    type?: string;
    id?: number;
    error?: string;
}): event is IframeErrorAnswerEvent =>
    typeof event.type === "string" && typeof event.id === "number" && typeof event.error === "string";*/

export const isIframeErrorAnswerEvent = z.object({
    id: z.number(),
    type: z.string(),
    error: z.string(),
});

/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone.
 */
export type IframeErrorAnswerEvent = z.infer<typeof isIframeErrorAnswerEvent>;
