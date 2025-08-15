import { Subject } from "rxjs";
import { availabilityStatusToJSON } from "@workadventure/messages";
import { BanEvent, ChatEvent, ChatMessage, KLAXOON_ACTIVITY_PICKER_EVENT } from "@workadventure/shared-utils";
import { StartWritingEvent, StopWritingEvent } from "@workadventure/shared-utils/src/Events/WritingEvent";
import { get } from "svelte/store";
import { asError } from "catch-unknown";
import { HtmlUtils } from "../WebRtc/HtmlUtils";
import {
    additionalButtonsMenu,
    handleMenuRegistrationEvent,
    handleMenuUnregisterEvent,
    handleOpenMenuEvent,
    warningBannerStore,
} from "../Stores/MenuStore";
import { ProtobufClientUtils } from "../Network/ProtobufClientUtils";
import type { MessageUserJoined } from "../Connection/ConnexionModels";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { bannerStore, requestVisitCardsStore } from "../Stores/GameStore";
import { modalIframeStore, modalVisibilityStore } from "../Stores/ModalStore";
import { connectionManager } from "../Connection/ConnectionManager";
import type { EnterLeaveEvent } from "./Events/EnterLeaveEvent";
import type { OpenPopupEvent } from "./Events/OpenPopupEvent";
import type { OpenTabEvent } from "./Events/OpenTabEvent";
import type { ButtonClickedEvent } from "./Events/ButtonClickedEvent";
import type { ClosePopupEvent } from "./Events/ClosePopupEvent";
import { scriptUtils } from "./ScriptUtils";
import type { IframeErrorAnswerEvent, IframeQueryMap, IframeResponseEvent } from "./Events/IframeEvent";
import { isIframeEventWrapper, isIframeQueryWrapper, isLookingLikeIframeEventWrapper } from "./Events/IframeEvent";
import type { UserInputChatEvent } from "./Events/UserInputChatEvent";
import type { PlaySoundEvent } from "./Events/PlaySoundEvent";
import type { StopSoundEvent } from "./Events/StopSoundEvent";
import type { LoadSoundEvent } from "./Events/LoadSoundEvent";
import type { SetPropertyEvent } from "./Events/SetPropertyEvent";
import type { LayerEvent } from "./Events/LayerEvent";
import type { SetTilesEvent } from "./Events/SetTilesEvent";
import type { SetVariableEvent } from "./Events/SetVariableEvent";
import type { ModifyEmbeddedWebsiteEvent } from "./Events/EmbeddedWebsiteEvent";
import type { ChangeLayerEvent } from "./Events/ChangeLayerEvent";
import type { WasCameraUpdatedEvent } from "./Events/WasCameraUpdatedEvent";
import type { ChangeAreaEvent } from "./Events/ChangeAreaEvent";
import type { CameraSetEvent } from "./Events/CameraSetEvent";
import type { CameraFollowPlayerEvent } from "./Events/CameraFollowPlayerEvent";
import type { AddActionsMenuKeyToRemotePlayerEvent } from "./Events/AddActionsMenuKeyToRemotePlayerEvent";
import type { ActionsMenuActionClickedEvent } from "./Events/ActionsMenuActionClickedEvent";
import type { RemoveActionsMenuKeyFromRemotePlayerEvent } from "./Events/RemoveActionsMenuKeyFromRemotePlayerEvent";
import type { SetAreaPropertyEvent } from "./Events/SetAreaPropertyEvent";
import type { ModifyUIWebsiteEvent } from "./Events/Ui/UIWebsiteEvent";
import type { ModifyDynamicAreaEvent } from "./Events/CreateDynamicAreaEvent";
import type { AskPositionEvent } from "./Events/AskPositionEvent";
import type { SetSharedPlayerVariableEvent } from "./Events/SetSharedPlayerVariableEvent";
import type { HasPlayerMovedInterface } from "./Events/HasPlayerMovedInterface";
import type { JoinProximityMeetingEvent } from "./Events/ProximityMeeting/JoinProximityMeetingEvent";
import type { ParticipantProximityMeetingEvent } from "./Events/ProximityMeeting/ParticipantProximityMeetingEvent";
import type { AddPlayerEvent } from "./Events/AddPlayerEvent";
import { ModalEvent } from "./Events/ModalEvent";
import { ReceiveEventEvent } from "./Events/ReceiveEventEvent";
import { StartStreamInBubbleEvent } from "./Events/ProximityMeeting/StartStreamInBubbleEvent";
import {
    IframeErrorMessagePortEvent,
    IframeMessagePortMap,
    IframeSuccessMessagePortEvent,
    isIframeMessagePortWrapper,
} from "./Events/MessagePortEvents";
import { CheckedWorkAdventureMessagePort } from "./Iframe/CheckedWorkAdventureMessagePort";

type AnswererCallback<T extends keyof IframeQueryMap> = (
    query: IframeQueryMap[T]["query"],
    source: MessageEventSource | null
) => IframeQueryMap[T]["answer"] | PromiseLike<IframeQueryMap[T]["answer"]>;

type OpenMessagePortAnswererCallback<T extends keyof IframeMessagePortMap> = (
    data: IframeMessagePortMap[T]["data"],
    port: CheckedWorkAdventureMessagePort<T>,
    source: MessageEventSource | null
) => void | PromiseLike<void>;

/**
 * Listens to messages from iframes and turn those messages into easy to use observables.
 * Also allows to send messages to those iframes.
 */
class IframeListener {
    private readonly _openPopupStream: Subject<OpenPopupEvent> = new Subject();
    public readonly openPopupStream = this._openPopupStream.asObservable();

    private readonly _openTabStream: Subject<OpenTabEvent> = new Subject();
    public readonly openTabStream = this._openTabStream.asObservable();

    private readonly _loadPageStream: Subject<string> = new Subject();
    public readonly loadPageStream = this._loadPageStream.asObservable();

    private readonly _openChatStream: Subject<void> = new Subject();
    public readonly openChatStream = this._openChatStream.asObservable();

    private readonly _closeChatStream: Subject<void> = new Subject();
    public readonly closeChatStream = this._closeChatStream.asObservable();

    private readonly _turnOffMicrophoneStream: Subject<void> = new Subject();
    public readonly turnOffMicrophoneStream = this._turnOffMicrophoneStream.asObservable();

    private readonly _turnOffWebcamStream: Subject<void> = new Subject();
    public readonly turnOffWebcamStream = this._turnOffWebcamStream.asObservable();

    private readonly _disableMicrophoneStream: Subject<void> = new Subject();
    public readonly disableMicrophoneStream = this._disableMicrophoneStream.asObservable();

    private readonly _restoreMicrophoneStream: Subject<void> = new Subject();
    public readonly restoreMicrophoneStream = this._restoreMicrophoneStream.asObservable();

    private readonly _disableWebcamStream: Subject<void> = new Subject();
    public readonly disableWebcamStream = this._disableWebcamStream.asObservable();

    private readonly _restoreWebcamStream: Subject<void> = new Subject();
    public readonly restoreWebcamStream = this._restoreWebcamStream.asObservable();

    private readonly _addPersonnalMessageStream: Subject<string> = new Subject();
    public readonly addPersonnalMessageStream = this._addPersonnalMessageStream.asObservable();

    private readonly _newChatMessageWritingStatusStream: Subject<number> = new Subject();
    public readonly newChatMessageWritingStatusStream = this._newChatMessageWritingStatusStream.asObservable();

    private readonly _disablePlayerControlStream: Subject<MessageEventSource | null> = new Subject();
    public readonly disablePlayerControlStream = this._disablePlayerControlStream.asObservable();

    private readonly _enablePlayerControlStream: Subject<MessageEventSource | null> = new Subject();
    public readonly enablePlayerControlStream = this._enablePlayerControlStream.asObservable();

    private readonly _disablePlayerProximityMeetingStream: Subject<void> = new Subject();
    public readonly disablePlayerProximityMeetingStream = this._disablePlayerProximityMeetingStream.asObservable();

    private readonly _enablePlayerProximityMeetingStream: Subject<void> = new Subject();
    public readonly enablePlayerProximityMeetingStream = this._enablePlayerProximityMeetingStream.asObservable();

    private readonly _cameraSetStream: Subject<CameraSetEvent> = new Subject();
    public readonly cameraSetStream = this._cameraSetStream.asObservable();

    private readonly _cameraFollowPlayerStream: Subject<CameraFollowPlayerEvent> = new Subject();
    public readonly cameraFollowPlayerStream = this._cameraFollowPlayerStream.asObservable();

    private readonly _addActionsMenuKeyToRemotePlayerStream: Subject<AddActionsMenuKeyToRemotePlayerEvent> =
        new Subject();
    public readonly addActionsMenuKeyToRemotePlayerStream = this._addActionsMenuKeyToRemotePlayerStream.asObservable();

    private readonly _removeActionsMenuKeyFromRemotePlayerEvent: Subject<RemoveActionsMenuKeyFromRemotePlayerEvent> =
        new Subject();
    public readonly removeActionsMenuKeyFromRemotePlayerEvent =
        this._removeActionsMenuKeyFromRemotePlayerEvent.asObservable();

    private readonly _closePopupStream: Subject<ClosePopupEvent> = new Subject();
    public readonly closePopupStream = this._closePopupStream.asObservable();

    private readonly _displayBubbleStream: Subject<void> = new Subject();
    public readonly displayBubbleStream = this._displayBubbleStream.asObservable();

    private readonly _removeBubbleStream: Subject<void> = new Subject();
    public readonly removeBubbleStream = this._removeBubbleStream.asObservable();

    private readonly _showLayerStream: Subject<LayerEvent> = new Subject();
    public readonly showLayerStream = this._showLayerStream.asObservable();

    private readonly _hideLayerStream: Subject<LayerEvent> = new Subject();
    public readonly hideLayerStream = this._hideLayerStream.asObservable();

    private readonly _setPropertyStream: Subject<SetPropertyEvent> = new Subject();
    public readonly setPropertyStream = this._setPropertyStream.asObservable();

    private readonly _setAreaPropertyStream: Subject<SetAreaPropertyEvent> = new Subject();
    public readonly setAreaPropertyStream = this._setAreaPropertyStream.asObservable();

    private readonly _playSoundStream: Subject<PlaySoundEvent> = new Subject();
    public readonly playSoundStream = this._playSoundStream.asObservable();

    private readonly _stopSoundStream: Subject<StopSoundEvent> = new Subject();
    public readonly stopSoundStream = this._stopSoundStream.asObservable();

    private readonly _loadSoundStream: Subject<LoadSoundEvent> = new Subject();
    public readonly loadSoundStream = this._loadSoundStream.asObservable();

    private readonly _trackCameraUpdateStream: Subject<void> = new Subject();
    public readonly trackCameraUpdateStream = this._trackCameraUpdateStream.asObservable();

    private readonly _setTilesStream: Subject<SetTilesEvent> = new Subject();
    public readonly setTilesStream = this._setTilesStream.asObservable();

    private readonly _modifyEmbeddedWebsiteStream: Subject<ModifyEmbeddedWebsiteEvent> = new Subject();
    public readonly modifyEmbeddedWebsiteStream = this._modifyEmbeddedWebsiteStream.asObservable();

    private readonly _modifyAreaStream: Subject<ModifyDynamicAreaEvent> = new Subject();
    public readonly modifyAreaStream = this._modifyAreaStream.asObservable();

    private readonly _modifyUIWebsiteStream: Subject<ModifyUIWebsiteEvent> = new Subject();
    public readonly modifyUIWebsiteStream = this._modifyUIWebsiteStream.asObservable();

    private readonly _askPositionStream: Subject<AskPositionEvent> = new Subject();
    public readonly askPositionStream = this._askPositionStream.asObservable();

    private readonly _openInviteMenuStream: Subject<void> = new Subject();
    public readonly openInviteMenuStream = this._openInviteMenuStream.asObservable();

    private readonly _banPlayerIframeEvent: Subject<BanEvent> = new Subject();
    public readonly banPlayerIframeEvent = this._banPlayerIframeEvent.asObservable();

    private readonly _mapEditorStream: Subject<boolean> = new Subject();
    public readonly mapEditorStream = this._mapEditorStream.asObservable();

    private readonly _screenSharingStream: Subject<boolean> = new Subject();
    public readonly screenSharingStream = this._screenSharingStream.asObservable();

    private readonly _rightClickStream: Subject<boolean> = new Subject();
    public readonly rightClickStream = this._rightClickStream.asObservable();

    private readonly _wheelZoomStream: Subject<boolean> = new Subject();
    public readonly wheelZoomStream = this._wheelZoomStream.asObservable();

    private readonly _inviteUserButtonStream: Subject<boolean> = new Subject();
    public readonly inviteUserButtonStream = this._inviteUserButtonStream.asObservable();

    private readonly _roomListStream: Subject<boolean> = new Subject();
    public readonly roomListButtonStream = this._roomListStream.asObservable();

    private readonly _chatMessageStream: Subject<ChatEvent> = new Subject();
    public readonly chatMessageStream = this._chatMessageStream.asObservable();

    private readonly _startTypingProximityMessageStream: Subject<StartWritingEvent> = new Subject();
    public readonly startTypingProximityMessageStream = this._startTypingProximityMessageStream.asObservable();

    private readonly _stopTypingProximityMessageStream: Subject<StopWritingEvent> = new Subject();
    public readonly stopTypingProximityMessageStream = this._stopTypingProximityMessageStream.asObservable();

    private readonly _startListeningToStreamInBubbleStream: Subject<StartStreamInBubbleEvent> = new Subject();
    public readonly startListeningToStreamInBubbleStream = this._startListeningToStreamInBubbleStream.asObservable();

    private readonly _stopListeningToStreamInBubbleStream: Subject<void> = new Subject();
    public readonly stopListeningToStreamInBubbleStream = this._stopListeningToStreamInBubbleStream.asObservable();

    private readonly iframes = new Map<HTMLIFrameElement, string | undefined>();
    private readonly iframeCloseCallbacks = new Map<MessageEventSource, Set<() => void>>();
    private readonly scripts = new Map<string, HTMLIFrameElement>();

    private sendPlayerMove = false;

    // Note: we are forced to type this in unknown and later cast with "as" because of https://github.com/microsoft/TypeScript/issues/31904
    private answerers: {
        [str in keyof IframeQueryMap]?: unknown;
    } = {};

    // Note: we are forced to type this in unknown and later cast with "as" because of https://github.com/microsoft/TypeScript/issues/31904
    private readonly openMessagePortAnswerers: { [K in keyof IframeMessagePortMap]?: unknown } = {};

    public getUIWebsiteIframeIdFromSource(source: MessageEventSource): string | undefined {
        for (const [iframe, id] of this.iframes.entries()) {
            if (iframe.contentWindow === source) {
                return id;
            }
        }
        return undefined;
    }

    init() {
        // The listener is part of a singleton and will never be unregistered.
        // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
        window.addEventListener(
            "message",
            (message: MessageEvent) => {
                // Do we trust the sender of this message?
                // Let's only accept messages from the iframe that are allowed.
                // Note: maybe we could restrict on the domain too for additional security (in case the iframe goes to another domain).
                let foundSrc: string | undefined;

                let iframe: HTMLIFrameElement | undefined;

                // if the message source is Klaxoon, we set the src to the content window of the iframe
                if (message.origin === "https://app.klaxoon.com") {
                    foundSrc = message.origin;
                }
                for (iframe of this.iframes.keys()) {
                    if (iframe.contentWindow === message.source) {
                        foundSrc = iframe.src;
                        break;
                    }
                }

                const payload = message.data;

                const lookingLikeEvent = isLookingLikeIframeEventWrapper.safeParse(payload);

                if (foundSrc === undefined || iframe === undefined) {
                    if (lookingLikeEvent.success) {
                        console.warn(
                            "It seems an iFrame is trying to communicate with WorkAdventure but was not explicitly granted the permission to do so. " +
                                "If you are looking to use the WorkAdventure Scripting API inside an iFrame, you should allow the " +
                                'iFrame to communicate with WorkAdventure by using the "openWebsiteAllowApi" property in your map (or passing "true" as a second' +
                                "parameter to WA.nav.openCoWebSite())"
                        );
                    }
                    return;
                }

                if (isIframeMessagePortWrapper(payload)) {
                    const queryId = payload.id;
                    const port = message.ports[0];
                    if (!port) {
                        console.error("Received a message with messagePort=true but no port was provided.");
                        return;
                    }

                    const messagePort = new CheckedWorkAdventureMessagePort(port, payload.type);

                    if (!message.source) {
                        throw new Error("Message is missing a source");
                    }
                    // If the calling iframe is closed, we need to close the message port
                    this.onIframeCloseEvent(message.source, () => {
                        messagePort.onCloseIframe();
                    });

                    const answerer = this.openMessagePortAnswerers[payload.type] as
                        | OpenMessagePortAnswererCallback<keyof IframeMessagePortMap>
                        | undefined;
                    if (answerer === undefined) {
                        const errorMsg =
                            'The iFrame sent an open port message of type "' +
                            payload.type +
                            '" but there is no service configured to answer these messages.';
                        console.error(errorMsg);
                        iframe.contentWindow?.postMessage(
                            {
                                id: queryId,
                                type: payload.type,
                                error: errorMsg,
                            } as IframeErrorAnswerEvent,
                            "*"
                        );
                        return;
                    }

                    const errorHandler = (reason: unknown) => {
                        console.error(
                            "An error occurred while responding to an iFrame open port message query.",
                            reason
                        );
                        const error = asError(reason);
                        const reasonMsg = error.message;

                        iframe?.contentWindow?.postMessage(
                            {
                                id: queryId,
                                messagePort: true,
                                error: reasonMsg,
                            } as IframeErrorMessagePortEvent,
                            "*"
                        );
                    };

                    try {
                        Promise.resolve(answerer(payload.data, messagePort, message.source))
                            .then((value) => {
                                iframe?.contentWindow?.postMessage(
                                    {
                                        id: queryId,
                                        messagePort: true,
                                    } satisfies IframeSuccessMessagePortEvent,
                                    "*"
                                );
                            })
                            .catch(errorHandler);
                    } catch (reason) {
                        errorHandler(reason);
                    }
                } else if (isIframeQueryWrapper(payload)) {
                    const queryId = payload.id;
                    const query = payload.query;

                    const answerer = this.answerers[query.type] as AnswererCallback<keyof IframeQueryMap> | undefined;
                    if (answerer === undefined) {
                        const errorMsg =
                            'The iFrame sent a message of type "' +
                            query.type +
                            '" but there is no service configured to answer these messages.';
                        console.error(errorMsg);
                        iframe.contentWindow?.postMessage(
                            {
                                id: queryId,
                                type: query.type,
                                error: errorMsg,
                            } as IframeErrorAnswerEvent,
                            "*"
                        );
                        return;
                    }

                    const errorHandler = (reason: unknown) => {
                        console.error("An error occurred while responding to an iFrame query.", reason);
                        const error = asError(reason);
                        const reasonMsg = error.message;

                        iframe?.contentWindow?.postMessage(
                            {
                                id: queryId,
                                type: query.type,
                                error: reasonMsg,
                            } as IframeErrorAnswerEvent,
                            "*"
                        );
                    };

                    try {
                        Promise.resolve(answerer(query.data, message.source))
                            .then((value) => {
                                iframe?.contentWindow?.postMessage(
                                    {
                                        id: queryId,
                                        type: query.type,
                                        data: value,
                                    },
                                    "*"
                                );
                            })
                            .catch(errorHandler);
                    } catch (reason) {
                        errorHandler(reason);
                    }
                } else if (lookingLikeEvent.success) {
                    const iframeEventGuarded = isIframeEventWrapper.safeParse(lookingLikeEvent.data);

                    if (!iframeEventGuarded.success) {
                        console.error(
                            `Invalid event "${lookingLikeEvent.data.type}" received from Iframe: `,
                            lookingLikeEvent.data,
                            iframeEventGuarded.error.issues
                        );
                        return;
                    }

                    const iframeEvent = iframeEventGuarded.data;

                    if (iframeEvent.type === "showLayer") {
                        this._showLayerStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "hideLayer") {
                        this._hideLayerStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "setProperty") {
                        this._setPropertyStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "setAreaProperty") {
                        this._setAreaPropertyStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "cameraSet") {
                        this._cameraSetStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "cameraFollowPlayer") {
                        this._cameraFollowPlayerStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "chat") {
                        this._chatMessageStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "startWriting") {
                        this._startTypingProximityMessageStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "stopWriting") {
                        this._stopTypingProximityMessageStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "startListeningToStreamInBubble") {
                        this._startListeningToStreamInBubbleStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "stopListeningToStreamInBubble") {
                        this._stopListeningToStreamInBubbleStream.next();
                    } else if (iframeEvent.type === "openChat") {
                        this._openChatStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "closeChat") {
                        this._closeChatStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "addPersonnalMessage") {
                        this._addPersonnalMessageStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "newChatMessageWritingStatus") {
                        this._newChatMessageWritingStatusStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "openPopup") {
                        this._openPopupStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "closePopup") {
                        this._closePopupStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "openTab") {
                        scriptUtils.openTab(iframeEvent.data.url);
                    } else if (iframeEvent.type === "goToPage") {
                        scriptUtils.goToPage(iframeEvent.data.url);
                    } else if (iframeEvent.type === "loadPage") {
                        this._loadPageStream.next(iframeEvent.data.url);
                    } else if (iframeEvent.type === "playSound") {
                        this._playSoundStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "stopSound") {
                        this._stopSoundStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "loadSound") {
                        this._loadSoundStream.next(iframeEvent.data);
                    } else if (iframeEvent.type === "disablePlayerControls") {
                        this._disablePlayerControlStream.next(message.source);
                    } else if (iframeEvent.type === "restorePlayerControls") {
                        this._enablePlayerControlStream.next(message.source);
                    } else if (iframeEvent.type === "turnOffMicrophone") {
                        this._turnOffMicrophoneStream.next();
                    } else if (iframeEvent.type === "turnOffWebcam") {
                        this._turnOffWebcamStream.next();
                    } else if (iframeEvent.type === "disableMicrophone") {
                        this._disableMicrophoneStream.next();
                    } else if (iframeEvent.type === "restoreMicrophone") {
                        this._restoreMicrophoneStream.next();
                    } else if (iframeEvent.type === "disableWebcam") {
                        this._disableWebcamStream.next();
                    } else if (iframeEvent.type === "restoreWebcam") {
                        this._restoreWebcamStream.next();
                    } else if (iframeEvent.type === "disablePlayerProximityMeeting") {
                        this._disablePlayerProximityMeetingStream.next();
                    } else if (iframeEvent.type === "restorePlayerProximityMeeting") {
                        this._enablePlayerProximityMeetingStream.next();
                    } else if (iframeEvent.type === "displayBubble") {
                        this._displayBubbleStream.next();
                    } else if (iframeEvent.type === "removeBubble") {
                        this._removeBubbleStream.next();
                    } else if (iframeEvent.type == "onPlayerMove") {
                        this.sendPlayerMove = true;
                    } else if (iframeEvent.type == "addActionsMenuKeyToRemotePlayer") {
                        this._addActionsMenuKeyToRemotePlayerStream.next(iframeEvent.data);
                    } else if (iframeEvent.type == "removeActionsMenuKeyFromRemotePlayer") {
                        this._removeActionsMenuKeyFromRemotePlayerEvent.next(iframeEvent.data);
                    } else if (iframeEvent.type == "onCameraUpdate") {
                        this._trackCameraUpdateStream.next();
                    } else if (iframeEvent.type == "setTiles") {
                        this._setTilesStream.next(iframeEvent.data);
                    } else if (iframeEvent.type == "modifyEmbeddedWebsite") {
                        this._modifyEmbeddedWebsiteStream.next(iframeEvent.data);
                    } else if (iframeEvent.type == "modifyArea") {
                        this._modifyAreaStream.next(iframeEvent.data);
                    } else if (iframeEvent.type == "modifyUIWebsite") {
                        this._modifyUIWebsiteStream.next(iframeEvent.data);
                    } else if (iframeEvent.type == "registerMenu") {
                        const dataName = iframeEvent.data.name;
                        if (!message.source) {
                            throw new Error("Message is missing a source");
                        }
                        this.iframeCloseCallbacks.get(message.source)?.add(() => {
                            handleMenuUnregisterEvent(dataName);
                        });

                        foundSrc = this.getBaseUrl(foundSrc, message.source);

                        handleMenuRegistrationEvent(
                            iframeEvent.data.name,
                            iframeEvent.data.iframe,
                            iframeEvent.data.key,
                            foundSrc,
                            iframeEvent.data.options
                        );
                    } else if (iframeEvent.type == "unregisterMenu") {
                        handleMenuUnregisterEvent(iframeEvent.data.key);
                    } else if (iframeEvent.type == "openMenu") {
                        handleOpenMenuEvent(iframeEvent.data.key);
                    } else if (iframeEvent.type == "askPosition") {
                        this._askPositionStream.next(iframeEvent.data);
                    } else if (iframeEvent.type == "openInviteMenu") {
                        this._openInviteMenuStream.next();
                    } else if (iframeEvent.type == "login") {
                        analyticsClient.login();
                        window.location.href = "/login";
                    } else if (iframeEvent.type == "redirectPricing") {
                        if (connectionManager.currentRoom && connectionManager.currentRoom.pricingUrl) {
                            window.location.href = connectionManager.currentRoom.pricingUrl;
                        }
                    } else if (iframeEvent.type == "refresh") {
                        window.location.reload();
                    } else if (iframeEvent.type == "showBusinessCard") {
                        requestVisitCardsStore.set(iframeEvent.data.visitCardUrl);
                    } else if (iframeEvent.type == "openModal") {
                        modalIframeStore.set(iframeEvent.data);
                        modalVisibilityStore.set(true);
                    } else if (iframeEvent.type == "closeModal") {
                        // Get modal and send close event to trigger close event
                        const modalIframe = get(modalIframeStore);
                        if (modalIframe) iframeListener.sendModalCloseTriggered(modalIframe);

                        // Close modal
                        modalVisibilityStore.set(false);
                        modalIframeStore.set(null);
                    } else if (iframeEvent.type == "addButtonActionBar") {
                        additionalButtonsMenu.addAdditionalButtonActionBar(iframeEvent.data);
                    } else if (iframeEvent.type == "removeButtonActionBar") {
                        additionalButtonsMenu.removeAdditionalButtonActionBar(iframeEvent.data);
                    } else if (iframeEvent.type == "openBanner") {
                        warningBannerStore.activateWarningContainer(iframeEvent.data.timeToClose);
                        bannerStore.set(iframeEvent.data);
                    } else if (iframeEvent.type == "closeBanner") {
                        warningBannerStore.set(false);
                        bannerStore.set(null);
                    } else if (iframeEvent.type == KLAXOON_ACTIVITY_PICKER_EVENT) {
                        // dispacth event on windows
                        const event = new MessageEvent(
                            "AcitivityPickerFromWorkAdventure",
                            message as unknown as MessageEventInit<unknown>
                        );
                        window.dispatchEvent(event);
                    } else if (iframeEvent.type == "banUser") {
                        this._banPlayerIframeEvent.next(iframeEvent.data);
                    } else if (iframeEvent.type == "disableMapEditor") {
                        this._mapEditorStream.next(false);
                    } else if (iframeEvent.type == "restoreMapEditor") {
                        this._mapEditorStream.next(true);
                    } else if (iframeEvent.type == "disableScreenSharing") {
                        this._screenSharingStream.next(false);
                    } else if (iframeEvent.type == "restoreScreenSharing") {
                        this._screenSharingStream.next(true);
                    } else if (iframeEvent.type == "disableRightClick") {
                        this._rightClickStream.next(false);
                    } else if (iframeEvent.type == "restoreRightClick") {
                        this._rightClickStream.next(true);
                    } else if (iframeEvent.type == "disableWheelZoom") {
                        this._wheelZoomStream.next(false);
                    } else if (iframeEvent.type == "restoreWheelZoom") {
                        this._wheelZoomStream.next(true);
                    } else if (iframeEvent.type == "disableInviteUserButton") {
                        this._inviteUserButtonStream.next(false);
                    } else if (iframeEvent.type == "restoreInviteUserButton") {
                        this._inviteUserButtonStream.next(true);
                    } else if (iframeEvent.type == "disableRoomList") {
                        this._roomListStream.next(false);
                    } else if (iframeEvent.type == "restoreRoomList") {
                        this._roomListStream.next(true);
                    } else {
                        // Keep the line below. It will throw an error if we forget to handle one of the possible values.
                        const _exhaustiveCheck: never = iframeEvent;
                    }
                }
            },
            false
        );
    }

    /**
     * Allows the passed iFrame to send/receive messages via the API.
     */
    registerIframe(iframe: HTMLIFrameElement, id?: string): void {
        this.iframes.set(iframe, id);
        iframe.addEventListener("load", () => {
            if (iframe.contentWindow) {
                this.iframeCloseCallbacks.set(iframe.contentWindow, new Set());
            } else {
                console.error('Could not register "iframeCloseCallbacks". No contentWindow.');
            }
        });
    }

    unregisterIframe(iframe: HTMLIFrameElement): void {
        if (iframe.contentWindow) {
            this.iframeCloseCallbacks.get(iframe.contentWindow)?.forEach((callback) => {
                callback();
            });
            this.iframeCloseCallbacks.delete(iframe.contentWindow);
        }
        this.iframes.delete(iframe);
    }

    /**
     * Registers an event listener to know when iframes are closed and returns an "unsubscriber" function.
     */
    onIframeCloseEvent(source: MessageEventSource, callback: () => void): () => void {
        let callbackSet = this.iframeCloseCallbacks.get(source);
        if (callbackSet === undefined) {
            // It is possible that the iframe is not registered yet (register happens on the "load" event of the iframe, but it could be triggered AFTER first events are received).
            callbackSet = new Set();
            this.iframeCloseCallbacks.set(source, callbackSet);
        }
        callbackSet.add(callback);
        return () => {
            callbackSet?.delete(callback);
        };
    }

    registerScript(scriptUrl: string, enableModuleMode = true): Promise<void> {
        return Promise.race([
            new Promise<void>((resolve) => {
                console.info("Loading map related script at ", scriptUrl);

                const iframe = document.createElement("iframe");
                iframe.id = IframeListener.getIFrameId(scriptUrl);
                iframe.style.display = "none";

                // We are putting a sandbox on this script because it will run in the same domain as the main website.
                iframe.sandbox.add("allow-scripts");
                iframe.sandbox.add("allow-top-navigation-by-user-activation");

                const scriptUrlObj = new URL(scriptUrl, window.location.href);
                // Note: we define the base URL to be the same as the script URL to fix some issues with some scripts using Vite.
                const scriptUrlBase = scriptUrlObj.protocol + "//" + scriptUrlObj.host;

                //iframe.src = "data:text/html;charset=utf-8," + escape(html);
                iframe.srcdoc = `
<!doctype html>
<html lang="en">
<head>
<base href="${scriptUrlBase}">
<script src="${window.location.protocol}//${window.location.host}/iframe_api.js" ></script>
<script ${enableModuleMode ? 'type="module" ' : ""}src="${scriptUrl}" ></script>
<title></title>
</head>
</html>
`;

                // The listener never needs to be removed, so we can use an inline function here.
                // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
                iframe.addEventListener("load", () => {
                    resolve();
                });

                document.body.prepend(iframe);

                this.scripts.set(scriptUrl, iframe);
                this.registerIframe(iframe);
            }),

            new Promise<void>((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Timeout while loading script " + scriptUrl));
                }, 30_000);
            }),
        ]);
    }

    private getBaseUrl(src: string, source: MessageEventSource | null): string {
        for (const script of this.scripts) {
            if (script[1].contentWindow === source) {
                return script[0];
            }
        }
        return src;
    }

    public getBaseUrlFromSource(source: MessageEventSource): string {
        let foundSrc: string | undefined;
        let iframe: HTMLIFrameElement | undefined;

        for (iframe of this.iframes.keys()) {
            if (iframe.contentWindow === source) {
                foundSrc = iframe.src;
                break;
            }
        }

        return this.getBaseUrl(foundSrc ?? "", source);
    }

    private static getIFrameId(scriptUrl: string): string {
        return "script" + btoa(scriptUrl);
    }

    unregisterScript(scriptUrl: string): void {
        const iFrameId = IframeListener.getIFrameId(scriptUrl);
        const iframe = HtmlUtils.getElementByIdOrFail<HTMLIFrameElement>(iFrameId);
        if (!iframe) {
            throw new Error('Unknown iframe for script "' + scriptUrl + '"');
        }
        this.unregisterIframe(iframe);
        iframe.remove();

        this.scripts.delete(scriptUrl);
    }

    /**
     * @param message The message to dispatch
     * @param senderId The id of the sender (or undefined if the message is sent by the current user)
     * @param exceptOrigin Don't dispatch the message to exceptOrigin (to avoid infinite loops)
     */
    sendUserInputChat(message: string, senderId: string | undefined, exceptOrigin?: Window) {
        this.postMessage(
            {
                type: "userInputChat",
                data: {
                    message,
                    senderId,
                } as UserInputChatEvent,
            },
            exceptOrigin
        );
    }

    sendJoinProximityMeetingEvent(users: MessageUserJoined[]) {
        const formattedUsers: AddPlayerEvent[] = users.map((user) => {
            return {
                playerId: user.userId,
                name: user.name,
                userUuid: user.userUuid,
                outlineColor: user.outlineColor,
                availabilityStatus: availabilityStatusToJSON(user.availabilityStatus),
                position: user.position,
                variables: user.variables,
            };
        });

        this.postMessage({
            type: "joinProximityMeetingEvent",
            data: {
                users: formattedUsers,
            } as JoinProximityMeetingEvent,
        });
    }

    sendParticipantJoinProximityMeetingEvent(user: MessageUserJoined) {
        this.postMessage({
            type: "participantJoinProximityMeetingEvent",
            data: {
                user: {
                    playerId: user.userId,
                    name: user.name,
                    userUuid: user.userUuid,
                    outlineColor: user.outlineColor,
                    availabilityStatus: availabilityStatusToJSON(user.availabilityStatus),
                    position: user.position,
                    variables: user.variables,
                },
            } as ParticipantProximityMeetingEvent,
        });
    }

    sendParticipantLeaveProximityMeetingEvent(user: MessageUserJoined) {
        this.postMessage({
            type: "participantLeaveProximityMeetingEvent",
            data: {
                user: {
                    playerId: user.userId,
                    name: user.name,
                    userUuid: user.userUuid,
                    outlineColor: user.outlineColor,
                    availabilityStatus: availabilityStatusToJSON(user.availabilityStatus),
                    position: user.position,
                    variables: user.variables,
                },
            } as ParticipantProximityMeetingEvent,
        });
    }

    sendLeaveProximityMeetingEvent() {
        this.postMessage({
            type: "leaveProximityMeetingEvent",
            data: undefined,
        });
    }

    sendFollowedEvent(follower: AddPlayerEvent) {
        this.postMessage({
            type: "onFollowed",
            data: {
                user: follower,
            },
        });
    }

    sendUnfollowedEvent(follower: AddPlayerEvent) {
        this.postMessage({
            type: "onUnfollowed",
            data: {
                user: follower,
            },
        });
    }

    sendEnterEvent(name: string) {
        this.postMessage({
            type: "enterEvent",
            data: {
                name: name,
            } as EnterLeaveEvent,
        });
    }

    sendLeaveEvent(name: string) {
        this.postMessage({
            type: "leaveEvent",
            data: {
                name: name,
            } as EnterLeaveEvent,
        });
    }

    sendEnterLayerEvent(layerName: string) {
        this.postMessage({
            type: "enterLayerEvent",
            data: {
                name: layerName,
            } as ChangeLayerEvent,
        });
    }

    sendLeaveLayerEvent(layerName: string) {
        this.postMessage({
            type: "leaveLayerEvent",
            data: {
                name: layerName,
            } as ChangeLayerEvent,
        });
    }

    sendEnterAreaEvent(areaName: string) {
        this.postMessage({
            type: "enterAreaEvent",
            data: {
                name: areaName,
            } as ChangeAreaEvent,
        });
    }

    sendLeaveAreaEvent(areaName: string) {
        this.postMessage({
            type: "leaveAreaEvent",
            data: {
                name: areaName,
            } as ChangeAreaEvent,
        });
    }

    sendEnterMapEditorAreaEvent(areaName: string) {
        this.postMessage({
            type: "enterMapEditorAreaEvent",
            data: {
                name: areaName,
            } as ChangeAreaEvent,
        });
    }
    sendLeaveMapEditorAreaEvent(areaName: string) {
        this.postMessage({
            type: "leaveMapEditorAreaEvent",
            data: {
                name: areaName,
            } as ChangeAreaEvent,
        });
    }

    hasPlayerMoved(event: HasPlayerMovedInterface) {
        if (this.sendPlayerMove) {
            this.postMessage({
                type: "hasPlayerMoved",
                data: {
                    x: event.x,
                    y: event.y,
                    oldX: event.oldX,
                    oldY: event.oldY,
                    direction: ProtobufClientUtils.toDirectionString(event.direction),
                    moving: event.moving,
                },
            });
        }
    }

    sendRemotePlayerClickedEvent(user: MessageUserJoined) {
        this.postMessage({
            type: "remotePlayerClickedEvent",
            data: {
                playerId: user.userId,
                name: user.name,
                userUuid: user.userUuid,
                outlineColor: user.outlineColor,
                availabilityStatus: availabilityStatusToJSON(user.availabilityStatus),
                position: user.position,
                variables: user.variables,
            },
        });
    }

    sendActionsMenuActionClickedEvent(event: ActionsMenuActionClickedEvent) {
        this.postMessage({
            type: "actionsMenuActionClickedEvent",
            data: event,
        });
    }

    sendCameraUpdated(event: WasCameraUpdatedEvent) {
        this.postMessage({
            type: "wasCameraUpdated",
            data: event,
        });
    }

    sendButtonClickedEvent(popupId: number, buttonId: number): void {
        this.postMessage({
            type: "buttonClickedEvent",
            data: {
                popupId,
                buttonId,
            } as ButtonClickedEvent,
        });
    }

    setVariable(setVariableEvent: SetVariableEvent) {
        this.postMessage({
            type: "setVariable",
            data: setVariableEvent,
        });
    }

    setSharedPlayerVariable(setSharedPlayerVariable: SetSharedPlayerVariableEvent) {
        this.postMessage({
            type: "setSharedPlayerVariable",
            data: setSharedPlayerVariable,
        });
    }

    dispatchReceivedEvent(receiveEventEvent: ReceiveEventEvent) {
        this.postMessage({
            type: "receiveEvent",
            data: receiveEventEvent,
        });
    }
    sendActionMessageTriggered(uuid: string): void {
        this.postMessage({
            type: "messageTriggered",
            data: {
                uuid,
            },
        });
    }
    async sendLeaveMucEventToChatIframe(url: string) {
        /*if (!connectionManager.currentRoom) {
            throw new Error("Race condition : Current room is not defined yet");
        } else if (!connectionManager.currentRoom.enableChat) {
            return;
        }
        (await chatConnectionManager.connectionPromise).leaveMuc(url);*/
    }

    async sendJoinMucEventToChatIframe(url: string, name: string, type: string, subscribe: boolean) {
        /*if (!connectionManager.currentRoom) {
            throw new Error("Race condition : Current room is not defined yet");
        } else if (!connectionManager.currentRoom.enableChat) {
            return;
        }
        (await chatConnectionManager.connectionPromise).joinMuc(name, url, type, subscribe);*/
    }

    sendMessageToChatIframe(chatMessage: ChatMessage) {
        /*if (chatMessage.text == undefined) {
            return;
        }
        const mucRoomDefault = mucRoomsStore.getDefaultRoom();
        let userData = undefined;
        if (mucRoomDefault && chatMessage.author && chatMessage.author.jid !== "fake") {
            try {
                userData = mucRoomDefault.getUserByJid(chatMessage.author.jid);
            } catch (e) {
                console.warn("Can't fetch user data from Ejabberd", e);
                userData = chatMessage.author;
            }
        } else {
            userData = chatMessage.author;
        }

        if (chatMessage.type === ChatMessageTypes.text) {
            if (!userData) {
                throw new Error("Received a message from the scripting API without an author");
            }
            for (const chatMessageText of chatMessage.text) {
                chatMessagesStore.addExternalMessage(userData, chatMessageText, userData.name);
            }
        } else if (chatMessage.type === ChatMessageTypes.me) {
            for (const chatMessageText of chatMessage.text) {
                chatMessagesStore.addPersonalMessage(chatMessageText);
            }
        }*/
    }

    sendButtonActionBarTriggered(id: string): void {
        this.postMessage({
            type: "buttonActionBarTriggered",
            data: id,
        });
    }
    sendModalCloseTriggered(modal: ModalEvent): void {
        this.postMessage({
            type: "modalCloseTrigger",
            data: modal,
        });
    }
    // end delete >>

    /**
     * Sends the message to all allowed iframes.
     */
    public postMessage(
        message: IframeResponseEvent,
        exceptOrigin?: MessageEventSource,
        transfer?: Transferable[]
    ): void {
        for (const iframe of this.iframes.keys()) {
            if (exceptOrigin === iframe.contentWindow) {
                continue;
            }
            iframe.contentWindow?.postMessage(message, "*", transfer);
        }
    }

    /**
     * Registers a callback that can be used to respond to some query (as defined in the IframeQueryMap type).
     *
     * Important! There can be only one "answerer" so registering a new one will unregister the old one.
     *
     * @param key The "type" of the query we are answering
     * @param callback
     */
    public registerAnswerer<T extends keyof IframeQueryMap>(key: T, callback: AnswererCallback<T>): void {
        if (this.answerers[key]) {
            throw new Error(`Answerer for key ${key} already registered`);
        }
        this.answerers[key] = callback;
    }

    public unregisterAnswerer(key: keyof IframeQueryMap): void {
        delete this.answerers[key];
    }

    public hideIFrames(hide = true): void {
        for (const iframe of this.iframes.keys()) {
            iframe.hidden = hide;
        }
    }

    dispatchVariableToOtherIframes(key: string, value: unknown, source: MessageEventSource | null) {
        // Let's dispatch the message to the other iframes
        this.postMessage(
            {
                type: "setVariable",
                data: {
                    key,
                    value,
                },
            },
            source ?? undefined
        );
    }

    dispatchPlayerVariableToOtherIframes(key: string, value: unknown, source: MessageEventSource | null) {
        // Let's dispatch the message to the other iframes
        this.postMessage(
            {
                type: "setPlayerVariable",
                data: {
                    key,
                    value,
                },
            },
            source ?? undefined
        );
    }

    cleanup() {}

    /*dispatchScriptableEventToOtherIframes(
        key: string,
        value: unknown,
        myId: number,
        source: MessageEventSource | null
    ) {
        // Let's dispatch the message to the other iframes
        this.postMessage(
            {
                type: "receiveEvent",
                data: {
                    key,
                    value,
                    senderId: myId,
                } as ReceiveEventEvent,
            },
            source ?? undefined
        );
    }*/

    /**
     * Registers a callback that can be used to respond to some query (as defined in the IframeQueryMap type).
     *
     * Important! There can be only one "answerer" so registering a new one will unregister the old one.
     *
     * @param key The "type" of the query we are answering
     * @param callback
     */
    public registerOpenMessagePortAnswerer<T extends keyof IframeMessagePortMap>(
        key: T,
        callback: OpenMessagePortAnswererCallback<T>
    ): void {
        this.openMessagePortAnswerers[key] = callback;
    }

    public unregisterOpenMessagePortAnswerer(key: keyof IframeMessagePortMap): void {
        delete this.openMessagePortAnswerers[key];
    }
}

export const iframeListener = new IframeListener();
