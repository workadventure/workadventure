import { Subject } from "rxjs";
import { isChatEvent } from "./Events/ChatEvent";
import { HtmlUtils } from "../WebRtc/HtmlUtils";
import type { EnterLeaveEvent } from "./Events/EnterLeaveEvent";
import { isOpenPopupEvent, OpenPopupEvent } from "./Events/OpenPopupEvent";
import { isOpenTabEvent, OpenTabEvent } from "./Events/OpenTabEvent";
import type { ButtonClickedEvent } from "./Events/ButtonClickedEvent";
import { ClosePopupEvent, isClosePopupEvent } from "./Events/ClosePopupEvent";
import { scriptUtils } from "./ScriptUtils";
import { isGoToPageEvent } from "./Events/GoToPageEvent";
import {
    IframeErrorAnswerEvent,
    IframeQueryMap,
    IframeResponseEvent,
    IframeResponseEventMap,
    isIframeEventWrapper,
    isIframeQueryWrapper,
} from "./Events/IframeEvent";
import type { UserInputChatEvent } from "./Events/UserInputChatEvent";
import { isPlaySoundEvent, PlaySoundEvent } from "./Events/PlaySoundEvent";
import { isStopSoundEvent, StopSoundEvent } from "./Events/StopSoundEvent";
import { isLoadSoundEvent, LoadSoundEvent } from "./Events/LoadSoundEvent";
import { isSetPropertyEvent, SetPropertyEvent } from "./Events/setPropertyEvent";
import { isLayerEvent, LayerEvent } from "./Events/LayerEvent";
import type { HasPlayerMovedEvent } from "./Events/HasPlayerMovedEvent";
import { isLoadPageEvent } from "./Events/LoadPageEvent";
import { isMenuRegisterEvent, isUnregisterMenuEvent } from "./Events/ui/MenuRegisterEvent";
import { SetTilesEvent, isSetTilesEvent } from "./Events/SetTilesEvent";
import type { SetVariableEvent } from "./Events/SetVariableEvent";
import { ModifyEmbeddedWebsiteEvent, isEmbeddedWebsiteEvent } from "./Events/EmbeddedWebsiteEvent";
import { handleMenuRegistrationEvent, handleMenuUnregisterEvent } from "../Stores/MenuStore";
import type { ChangeLayerEvent } from "./Events/ChangeLayerEvent";
import type { WasCameraUpdatedEvent } from "./Events/WasCameraUpdatedEvent";
import type { ChangeZoneEvent } from "./Events/ChangeZoneEvent";
import { CameraSetEvent, isCameraSetEvent } from "./Events/CameraSetEvent";
import { CameraFollowPlayerEvent, isCameraFollowPlayerEvent } from "./Events/CameraFollowPlayerEvent";

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

    private readonly _disablePlayerControlStream: Subject<void> = new Subject();
    public readonly disablePlayerControlStream = this._disablePlayerControlStream.asObservable();

    private readonly _cameraSetStream: Subject<CameraSetEvent> = new Subject();
    public readonly cameraSetStream = this._cameraSetStream.asObservable();

    private readonly _cameraFollowPlayerStream: Subject<CameraFollowPlayerEvent> = new Subject();
    public readonly cameraFollowPlayerStream = this._cameraFollowPlayerStream.asObservable();

    private readonly _enablePlayerControlStream: Subject<void> = new Subject();
    public readonly enablePlayerControlStream = this._enablePlayerControlStream.asObservable();

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

    private readonly iframes = new Set<HTMLIFrameElement>();
    private readonly iframeCloseCallbacks = new Map<HTMLIFrameElement, (() => void)[]>();
    private readonly scripts = new Map<string, HTMLIFrameElement>();
    private sendPlayerMove: boolean = false;

    // Note: we are forced to type this in unknown and later cast with "as" because of https://github.com/microsoft/TypeScript/issues/31904
    private answerers: {
        [str in keyof IframeQueryMap]?: unknown;
    } = {};

    init() {
        window.addEventListener(
            "message",
            (message: MessageEvent<unknown>) => {
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

                if (foundSrc === undefined || iframe === undefined) {
                    if (isIframeEventWrapper(payload)) {
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
                        let reasonMsg: string = "";
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
                } else if (isIframeEventWrapper(payload)) {
                    if (payload.type === "showLayer" && isLayerEvent(payload.data)) {
                        this._showLayerStream.next(payload.data);
                    } else if (payload.type === "hideLayer" && isLayerEvent(payload.data)) {
                        this._hideLayerStream.next(payload.data);
                    } else if (payload.type === "setProperty" && isSetPropertyEvent(payload.data)) {
                        this._setPropertyStream.next(payload.data);
                    } else if (payload.type === "cameraSet" && isCameraSetEvent(payload.data)) {
                        this._cameraSetStream.next(payload.data);
                    } else if (payload.type === "cameraFollowPlayer" && isCameraFollowPlayerEvent(payload.data)) {
                        this._cameraFollowPlayerStream.next(payload.data);
                    } else if (payload.type === "chat" && isChatEvent(payload.data)) {
                        scriptUtils.sendAnonymousChat(payload.data);
                    } else if (payload.type === "openPopup" && isOpenPopupEvent(payload.data)) {
                        this._openPopupStream.next(payload.data);
                    } else if (payload.type === "closePopup" && isClosePopupEvent(payload.data)) {
                        this._closePopupStream.next(payload.data);
                    } else if (payload.type === "openTab" && isOpenTabEvent(payload.data)) {
                        scriptUtils.openTab(payload.data.url);
                    } else if (payload.type === "goToPage" && isGoToPageEvent(payload.data)) {
                        scriptUtils.goToPage(payload.data.url);
                    } else if (payload.type === "loadPage" && isLoadPageEvent(payload.data)) {
                        this._loadPageStream.next(payload.data.url);
                    } else if (payload.type === "playSound" && isPlaySoundEvent(payload.data)) {
                        this._playSoundStream.next(payload.data);
                    } else if (payload.type === "stopSound" && isStopSoundEvent(payload.data)) {
                        this._stopSoundStream.next(payload.data);
                    } else if (payload.type === "loadSound" && isLoadSoundEvent(payload.data)) {
                        this._loadSoundStream.next(payload.data);
                    } else if (payload.type === "disablePlayerControls") {
                        this._disablePlayerControlStream.next();
                    } else if (payload.type === "restorePlayerControls") {
                        this._enablePlayerControlStream.next();
                    } else if (payload.type === "displayBubble") {
                        this._displayBubbleStream.next();
                    } else if (payload.type === "removeBubble") {
                        this._removeBubbleStream.next();
                    } else if (payload.type == "onPlayerMove") {
                        this.sendPlayerMove = true;
                    } else if (payload.type == "onCameraUpdate") {
                        this._trackCameraUpdateStream.next();
                    } else if (payload.type == "setTiles" && isSetTilesEvent(payload.data)) {
                        this._setTilesStream.next(payload.data);
                    } else if (payload.type == "modifyEmbeddedWebsite" && isEmbeddedWebsiteEvent(payload.data)) {
                        this._modifyEmbeddedWebsiteStream.next(payload.data);
                    } else if (payload.type == "registerMenu" && isMenuRegisterEvent(payload.data)) {
                        const dataName = payload.data.name;
                        this.iframeCloseCallbacks.get(iframe)?.push(() => {
                            handleMenuUnregisterEvent(dataName);
                        });

                        foundSrc = this.getBaseUrl(foundSrc, message.source);

                        handleMenuRegistrationEvent(
                            payload.data.name,
                            payload.data.iframe,
                            foundSrc,
                            payload.data.options
                        );
                    } else if (payload.type == "unregisterMenu" && isUnregisterMenuEvent(payload.data)) {
                        handleMenuUnregisterEvent(payload.data.name);
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
        this.iframeCloseCallbacks.set(iframe, []);
    }

    unregisterIframe(iframe: HTMLIFrameElement): void {
        this.iframeCloseCallbacks.get(iframe)?.forEach((callback) => {
            callback();
        });
        this.iframes.delete(iframe);
    }

    registerScript(scriptUrl: string, enableModuleMode: boolean = true): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            console.info("Loading map related script at ", scriptUrl);

            if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
                // Using external iframe mode (
                const iframe = document.createElement("iframe");
                iframe.id = IframeListener.getIFrameId(scriptUrl);
                iframe.style.display = "none";
                iframe.src =
                    "/iframe.html?script=" +
                    encodeURIComponent(scriptUrl) +
                    "&moduleMode=" +
                    (enableModuleMode ? "true" : "false");

                // We are putting a sandbox on this script because it will run in the same domain as the main website.
                iframe.sandbox.add("allow-scripts");
                iframe.sandbox.add("allow-top-navigation-by-user-activation");

                iframe.addEventListener("load", () => {
                    resolve();
                });

                document.body.prepend(iframe);

                this.scripts.set(scriptUrl, iframe);
                this.registerIframe(iframe);
            } else {
                // production code
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
            }
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

    sendUserInputChat(message: string) {
        this.postMessage({
            type: "userInputChat",
            data: {
                message: message,
            } as UserInputChatEvent,
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

    sendEnterZoneEvent(zoneName: string) {
        this.postMessage({
            type: "enterZoneEvent",
            data: {
                name: zoneName,
            } as ChangeZoneEvent,
        });
    }

    sendLeaveZoneEvent(zoneName: string) {
        this.postMessage({
            type: "leaveZoneEvent",
            data: {
                name: zoneName,
            } as ChangeZoneEvent,
        });
    }

    hasPlayerMoved(event: HasPlayerMovedEvent) {
        if (this.sendPlayerMove) {
            this.postMessage({
                type: "hasPlayerMoved",
                data: event,
            });
        }
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

    sendActionMessageTriggered(uuid: string): void {
        this.postMessage({
            type: "messageTriggered",
            data: {
                uuid,
            },
        });
    }

    /**
     * Sends the message... to all allowed iframes.
     */
    public postMessage(message: IframeResponseEvent<keyof IframeResponseEventMap>) {
        for (const iframe of this.iframes) {
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
        for (const iframe of this.iframes) {
            if (iframe.contentWindow !== source) {
                iframe.contentWindow?.postMessage(
                    {
                        type: "setVariable",
                        data: {
                            key,
                            value,
                        },
                    },
                    "*"
                );
            }
        }
    }
}

export const iframeListener = new IframeListener();
