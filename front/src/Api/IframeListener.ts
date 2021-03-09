import {Subject} from "rxjs";
import {ChatEvent, isChatEvent} from "./Events/ChatEvent";
import {IframeEvent, isIframeEventWrapper} from "./Events/IframeEvent";
import {UserInputChatEvent} from "./Events/UserInputChatEvent";
import * as crypto from "crypto";
import {HtmlUtils} from "../WebRtc/HtmlUtils";
import {EnterLeaveEvent} from "./Events/EnterLeaveEvent";
import {isOpenPopupEvent, OpenPopupEvent} from "./Events/OpenPopupEvent";
import {ButtonClickedEvent} from "./Events/ButtonClickedEvent";



/**
 * Listens to messages from iframes and turn those messages into easy to use observables.
 * Also allows to send messages to those iframes.
 */
class IframeListener {
    private readonly _chatStream: Subject<ChatEvent> = new Subject();
    public readonly chatStream = this._chatStream.asObservable();

    private readonly _openPopupStream: Subject<OpenPopupEvent> = new Subject();
    public readonly openPopupStream = this._openPopupStream.asObservable();

    private readonly iframes = new Set<HTMLIFrameElement>();
    private readonly scripts = new Map<string, HTMLIFrameElement>();

    init() {
        window.addEventListener("message", (message) => {
            // Do we trust the sender of this message?
            // Let's only accept messages from the iframe that are allowed.
            // Note: maybe we could restrict on the domain too for additional security (in case the iframe goes to another domain).
            let found = false;
            for (const iframe of this.iframes) {
                if (iframe.contentWindow === message.source) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return;
            }

            const payload = message.data;
            if (isIframeEventWrapper(payload)) {
                if (payload.type === 'chat' && isChatEvent(payload.data)) {
                    this._chatStream.next(payload.data);
                } else if (payload.type === 'openPopup' && isOpenPopupEvent(payload.data)) {
                    this._openPopupStream.next(payload.data);
                }
            }


        }, false);

    }

    /**
     * Allows the passed iFrame to send/receive messages via the API.
     */
    registerIframe(iframe: HTMLIFrameElement): void {
        this.iframes.add(iframe);
    }

    unregisterIframe(iframe: HTMLIFrameElement): void {
        this.iframes.delete(iframe);
    }

    registerScript(scriptUrl: string): void {
        console.log('Loading map related script at ', scriptUrl)

        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
            // Using external iframe mode (
            const iframe = document.createElement('iframe');
            iframe.id = this.getIFrameId(scriptUrl);
            iframe.style.display = 'none';
            iframe.src = '/iframe.html?script='+encodeURIComponent(scriptUrl);

            // We are putting a sandbox on this script because it will run in the same domain as the main website.
            iframe.sandbox.add('allow-scripts');
            iframe.sandbox.add('allow-top-navigation-by-user-activation');

            document.body.prepend(iframe);

            this.scripts.set(scriptUrl, iframe);
            this.registerIframe(iframe);
        } else {
            // production code
            const iframe = document.createElement('iframe');
            iframe.id = this.getIFrameId(scriptUrl);

            // We are putting a sandbox on this script because it will run in the same domain as the main website.
            iframe.sandbox.add('allow-scripts');
            iframe.sandbox.add('allow-top-navigation-by-user-activation');

            const html = '<!doctype html>\n' +
                '\n' +
                '<html lang="en">\n' +
                '<head>\n' +
                '<script src="'+window.location.protocol+'//'+window.location.host+'/iframe_api.js" ></script>\n' +
                '<script src="'+scriptUrl+'" ></script>\n' +
                '</head>\n' +
                '</html>\n';

            //iframe.src = "data:text/html;charset=utf-8," + escape(html);
            iframe.srcdoc = html;

            document.body.prepend(iframe);

            this.scripts.set(scriptUrl, iframe);
            this.registerIframe(iframe);
        }


    }

    private getIFrameId(scriptUrl: string): string {
        return 'script'+crypto.createHash('md5').update(scriptUrl).digest("hex");
    }

    unregisterScript(scriptUrl: string): void {
        const iFrameId = this.getIFrameId(scriptUrl);
        const iframe = HtmlUtils.getElementByIdOrFail<HTMLIFrameElement>(iFrameId);
        if (!iframe) {
            throw new Error('Unknown iframe for script "'+scriptUrl+'"');
        }
        this.unregisterIframe(iframe);
        iframe.remove();

        this.scripts.delete(scriptUrl);
    }

    sendUserInputChat(message: string) {
        this.postMessage({
            'type': 'userInputChat',
            'data': {
                'message': message,
            } as UserInputChatEvent
        });
    }

    sendEnterEvent(name: string) {
        this.postMessage({
            'type': 'enterEvent',
            'data': {
                "name": name
            } as EnterLeaveEvent
        });
    }

    sendLeaveEvent(name: string) {
        this.postMessage({
            'type': 'leaveEvent',
            'data': {
                "name": name
            } as EnterLeaveEvent
        });
    }

    sendButtonClickedEvent(popupId: number, buttonId: number): void {
        this.postMessage({
            'type': 'buttonClickedEvent',
            'data': {
                popupId,
                buttonId
            } as ButtonClickedEvent
        });
    }

    /**
     * Sends the message... to all allowed iframes.
     */
    private postMessage(message: IframeEvent) {
        for (const iframe of this.iframes) {
            iframe.contentWindow?.postMessage(message, '*');
        }
    }

}

export const iframeListener = new IframeListener();
