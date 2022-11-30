import { Subject } from "rxjs";
import { HtmlUtils } from "../WebRtc/HtmlUtils";
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
import { handleMenuRegistrationEvent, handleMenuUnregisterEvent } from "../Stores/MenuStore";
import type { ChangeLayerEvent } from "./Events/ChangeLayerEvent";
import type { WasCameraUpdatedEvent } from "./Events/WasCameraUpdatedEvent";
import type { ChangeAreaEvent } from "./Events/ChangeAreaEvent";
import type { CameraSetEvent } from "./Events/CameraSetEvent";
import type { CameraFollowPlayerEvent } from "./Events/CameraFollowPlayerEvent";
import type { AddActionsMenuKeyToRemotePlayerEvent } from "./Events/AddActionsMenuKeyToRemotePlayerEvent";
import type { ActionsMenuActionClickedEvent } from "./Events/ActionsMenuActionClickedEvent";
import type { RemoveActionsMenuKeyFromRemotePlayerEvent } from "./Events/RemoveActionsMenuKeyFromRemotePlayerEvent";
import type { SetAreaPropertyEvent } from "./Events/SetAreaPropertyEvent";
import type { ModifyUIWebsiteEvent } from "./Events/Ui/UIWebsite";
import type { ModifyAreaEvent } from "./Events/CreateAreaEvent";
import type { AskPositionEvent } from "./Events/AskPositionEvent";
import type { PlayerInterface } from "../Phaser/Game/PlayerInterface";
import type { SetSharedPlayerVariableEvent } from "./Events/SetSharedPlayerVariableEvent";
import { ProtobufClientUtils } from "../Network/ProtobufClientUtils";
import type { HasPlayerMovedInterface } from "./Events/HasPlayerMovedInterface";
import type { JoinProximityMeetingEvent } from "./Events/ProximityMeeting/JoinProximityMeetingEvent";
import type { ParticipantProximityMeetingEvent } from "./Events/ProximityMeeting/ParticipantProximityMeetingEvent";
import type { MessageUserJoined } from "../Connexion/ConnexionModels";
import { availabilityStatusToJSON } from "@workadventure/messages";
import type { AddPlayerEvent } from "./Events/AddPlayerEvent";
import { localUserStore } from "../Connexion/LocalUserStore";
import { mediaManager, NotificationType } from "../WebRtc/MediaManager";
import { analyticsClient } from "../Administration/AnalyticsClient";
import type { ChatMessage } from "./Events/ChatEvent";
import { requestVisitCardsStore } from "../Stores/GameStore";
import {
    modalIframeAllowApi,
    modalIframeAllowStore,
    modalIframeSrcStore,
    modalIframeTitleStore,
    modalPositionStore,
    modalVisibilityStore,
} from "../Stores/ModalStore";
import { connectionManager } from "../Connexion/ConnectionManager";
import { gameManager } from "../Phaser/Game/GameManager";

type AnswererCallback<T extends keyof IframeQueryMap> = (
    query: IframeQueryMap[T]["query"],
    source: MessageEventSource | null
) => IframeQueryMap[T]["answer"] | PromiseLike<IframeQueryMap[T]["answer"]>;

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

    private readonly _disablePlayerControlStream: Subject<void> = new Subject();
    public readonly disablePlayerControlStream = this._disablePlayerControlStream.asObservable();

    private readonly _enablePlayerControlStream: Subject<void> = new Subject();
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

    private readonly _trackCameraUpdateStream: Subject<LoadSoundEvent> = new Subject();
    public readonly trackCameraUpdateStream = this._trackCameraUpdateStream.asObservable();

    private readonly _setTilesStream: Subject<SetTilesEvent> = new Subject();
    public readonly setTilesStream = this._setTilesStream.asObservable();

    private readonly _modifyEmbeddedWebsiteStream: Subject<ModifyEmbeddedWebsiteEvent> = new Subject();
    public readonly modifyEmbeddedWebsiteStream = this._modifyEmbeddedWebsiteStream.asObservable();

    private readonly _modifyAreaStream: Subject<ModifyAreaEvent> = new Subject();
    public readonly modifyAreaStream = this._modifyAreaStream.asObservable();

    private readonly _modifyUIWebsiteStream: Subject<ModifyUIWebsiteEvent> = new Subject();
    public readonly modifyUIWebsiteStream = this._modifyUIWebsiteStream.asObservable();

    private readonly _askPositionStream: Subject<AskPositionEvent> = new Subject();
    public readonly askPositionStream = this._askPositionStream.asObservable();

    private readonly _openInviteMenuStream: Subject<void> = new Subject();
    public readonly openInviteMenuStream = this._openInviteMenuStream.asObservable();

    private readonly _chatTotalMessagesToSeeStream: Subject<number> = new Subject();
    public readonly chatTotalMessagesToSeeStream = this._chatTotalMessagesToSeeStream.asObservable();

    private readonly iframes = new Set<HTMLIFrameElement>();
    private readonly iframeCloseCallbacks = new Map<MessageEventSource, Set<() => void>>();
    private readonly scripts = new Map<string, HTMLIFrameElement>();

    private chatIframe: HTMLIFrameElement | null = null;

    private sendPlayerMove = false;

    // Note: we are forced to type this in unknown and later cast with "as" because of https://github.com/microsoft/TypeScript/issues/31904
    private answerers: {
        [str in keyof IframeQueryMap]?: unknown;
    } = {};

    private messagesToChatQueue = new Map<number, IframeResponseEvent>();

    init() {
        window.addEventListener(
            "message",
            (message: MessageEvent) => {
                // Do we trust the sender of this message?
                // Let's only accept messages from the iframe that are allowed.
                // Note: maybe we could restrict on the domain too for additional security (in case the iframe goes to another domain).
                let foundSrc: string | undefined;

                let iframe: HTMLIFrameElement | undefined;
                for (iframe of this.iframes) {
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

                if (isIframeQueryWrapper(payload)) {
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
                        let reasonMsg = "";
                        if (reason instanceof Error) {
                            reasonMsg = reason.message;
                        } else if (typeof reason === "object") {
                            reasonMsg = reason ? reason.toString() : "";
                        } else if (typeof reason === "string") {
                            reasonMsg = reason;
                        }

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
                        scriptUtils.sendAnonymousChat(iframeEvent.data, iframe.contentWindow ?? undefined);
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
                        this._disablePlayerControlStream.next();
                    } else if (iframeEvent.type === "restorePlayerControls") {
                        this._enablePlayerControlStream.next();
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
                            foundSrc,
                            iframeEvent.data.options
                        );
                    } else if (iframeEvent.type == "unregisterMenu") {
                        handleMenuUnregisterEvent(iframeEvent.data.name);
                    } else if (iframeEvent.type == "askPosition") {
                        this._askPositionStream.next(iframeEvent.data);
                    } else if (iframeEvent.type == "openInviteMenu") {
                        this._openInviteMenuStream.next();
                    } else if (iframeEvent.type == "chatTotalMessagesToSee") {
                        this._chatTotalMessagesToSeeStream.next(iframeEvent.data);
                    } else if (iframeEvent.type == "notification") {
                        const notificationType =
                            iframeEvent.data.notificationType === 1
                                ? NotificationType.discussion
                                : NotificationType.message;
                        mediaManager.createNotification(
                            iframeEvent.data.userName,
                            notificationType,
                            iframeEvent.data.forum
                        );
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
                        modalIframeTitleStore.set(iframeEvent.data.title);
                        modalIframeAllowStore.set(iframeEvent.data.allow);
                        modalIframeSrcStore.set(iframeEvent.data.src);
                        modalPositionStore.set(iframeEvent.data.position);
                        modalIframeAllowApi.set(iframeEvent.data.allowApi);
                        modalVisibilityStore.set(true);
                    } else if (iframeEvent.type == "closeModal") {
                        modalVisibilityStore.set(false);
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
    registerIframe(iframe: HTMLIFrameElement): void {
        this.iframes.add(iframe);
        iframe.addEventListener("load", () => {
            if (iframe.contentWindow) {
                this.iframeCloseCallbacks.set(iframe.contentWindow, new Set());
            } else {
                console.error('Could not register "iframeCloseCallbacks". No contentWindow.');
            }
        });
    }

    registerChatIframe(iframe: HTMLIFrameElement): void {
        this.registerIframe(iframe);
        this.chatIframe = iframe;
        if (this.messagesToChatQueue.size > 0) {
            this.messagesToChatQueue.forEach((message, time) => {
                this.postMessageToChat(message);
                this.messagesToChatQueue.delete(time);
            });
        }
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
        const callbackSet = this.iframeCloseCallbacks.get(source);
        if (callbackSet === undefined) {
            throw new Error("Could not find iframe in list");
        }
        callbackSet.add(callback);
        return () => {
            callbackSet.delete(callback);
        };
    }

    registerScript(scriptUrl: string, enableModuleMode = true): Promise<void> {
        return new Promise<void>((resolve) => {
            console.info("Loading map related script at ", scriptUrl);

            const iframe = document.createElement("iframe");
            iframe.id = IframeListener.getIFrameId(scriptUrl);
            iframe.style.display = "none";

            // We are putting a sandbox on this script because it will run in the same domain as the main website.
            iframe.sandbox.add("allow-scripts");
            iframe.sandbox.add("allow-top-navigation-by-user-activation");

            //iframe.src = "data:text/html;charset=utf-8," + escape(html);
            iframe.srcdoc =
                "<!doctype html>\n" +
                "\n" +
                '<html lang="en">\n' +
                "<head>\n" +
                '<script src="' +
                window.location.protocol +
                "//" +
                window.location.host +
                '/iframe_api.js" ></script>\n' +
                "<script " +
                (enableModuleMode ? 'type="module" ' : "") +
                'src="' +
                scriptUrl +
                '" ></script>\n' +
                "<title></title>\n" +
                "</head>\n" +
                "</html>\n";

            iframe.addEventListener("load", () => {
                resolve();
            });

            document.body.prepend(iframe);

            this.scripts.set(scriptUrl, iframe);
            this.registerIframe(iframe);
        });
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

        for (iframe of this.iframes) {
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
     * @param exceptOrigin Don't dispatch the message to exceptOrigin (to avoid infinite loops)
     */
    sendUserInputChat(message: string, exceptOrigin?: Window) {
        this.postMessage(
            {
                type: "userInputChat",
                data: {
                    message: message,
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

    sendActionMessageTriggered(uuid: string): void {
        this.postMessage({
            type: "messageTriggered",
            data: {
                uuid,
            },
        });
    }

    sendChatVisibilityToChatIframe(visibility: boolean) {
        this.postMessageToChat({
            type: "chatVisibility",
            data: {
                visibility,
            },
        });
    }
    sendSettingsToChatIframe() {
        if (!connectionManager.currentRoom) {
            throw new Error("Race condition : Current room is not defined yet");
        }
        const xmppSettingsMessage = gameManager.getCurrentGameScene().connection?.xmppSettingsMessage;
        if (xmppSettingsMessage) {
            this.postMessageToChat({
                type: "xmppSettingsMessage",
                data: xmppSettingsMessage,
            });
        }
        this.postMessageToChat({
            type: "settings",
            data: {
                notification: localUserStore.getNotification(),
                chatSounds: localUserStore.getChatSounds(),
                enableChat: connectionManager.currentRoom?.enableChat,
                enableChatUpload: connectionManager.currentRoom?.enableChatUpload,
                enableChatDisconnectedList: connectionManager.currentRoom?.enableChatDisconnectedList,
            },
        });
    }

    sendLeaveMucEventToChatIframe(url: string) {
        if (!connectionManager.currentRoom) {
            throw new Error("Race condition : Current room is not defined yet");
        } else if (!connectionManager.currentRoom.enableChat) {
            return;
        }
        this.postMessageToChat({
            type: "leaveMuc",
            data: {
                url,
            },
        });
    }

    sendJoinMucEventToChatIframe(url: string, name: string, type: string, subscribe: boolean) {
        if (!connectionManager.currentRoom) {
            throw new Error("Race condition : Current room is not defined yet");
        } else if (!connectionManager.currentRoom.enableChat) {
            return;
        }
        this.postMessageToChat({
            type: "joinMuc",
            data: {
                url,
                name,
                type,
                subscribe,
            },
        });
    }

    sendAvailabilityStatusToChatIframe(status: number) {
        this.postMessageToChat({
            type: "availabilityStatus",
            data: status,
        });
    }

    // << TODO delete with chat XMPP integration for the discussion circle
    sendWritingStatusToChatIframe(list: Set<PlayerInterface>) {
        const usersTyping: Array<string> = [];
        list.forEach((user) => usersTyping.push(user.userJid));
        this.postMessageToChat({
            type: "updateWritingStatusChatList",
            data: usersTyping,
        });
    }

    sendMessageToChatIframe(chatMessage: ChatMessage) {
        this.postMessageToChat({
            type: "addChatMessage",
            data: chatMessage,
        });
    }

    sendComingUserToChatIframe(chatMessage: ChatMessage) {
        this.postMessageToChat({
            type: "comingUser",
            data: chatMessage,
        });
    }
    sendPeerConnexionStatusToChatIframe(status: boolean) {
        this.postMessageToChat({
            type: "peerConnectionStatus",
            data: status,
        });
    }
    // end delete >>

    /**
     * Sends the message... to the chat iFrame.
     */
    postMessageToChat(message: IframeResponseEvent) {
        if (!this.chatIframe) {
            this.chatIframe = document.getElementById("chatWorkAdventure") as HTMLIFrameElement | null;
        }
        try {
            if (!this.chatIframe || !this.chatIframe.contentWindow || !this.chatIframe.contentWindow.postMessage) {
                throw new Error("No chat iFrame registered");
            } else {
                this.chatIframe.contentWindow?.postMessage(message, this.chatIframe?.src);
            }
        } catch (err) {
            console.error("postMessageToChat Error => ", err);
            this.messagesToChatQueue.set(Date.now(), message);
        }
    }

    /**
     * Sends the message... to all allowed iframes and not the chat.
     */
    public postMessage(message: IframeResponseEvent, exceptOrigin?: MessageEventSource) {
        for (const iframe of this.iframes) {
            if (exceptOrigin === iframe.contentWindow || iframe.src === this.chatIframe?.src) {
                continue;
            }
            iframe.contentWindow?.postMessage(message, "*");
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
        this.answerers[key] = callback;
    }

    public unregisterAnswerer(key: keyof IframeQueryMap): void {
        delete this.answerers[key];
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
}

export const iframeListener = new IframeListener();
