import { coWebsiteManager } from "../WebRtc/CoWebsiteManager";
import { OpenCoWebSiteOptionsEvent } from './Events/OpenCoWebSiteEvent';

class ScriptUtils {

    private listeners: Array<{ type: string, listener: EventListenerOrEventListenerObject }> = []

    public openTab(url: string) {
        window.open(url);
    }

    public goToPage(url: string) {
        window.location.href = url;

    }

    public openCoWebsite(url: string, base: string, scriptWindow: MessageEventSource | null, options?: OpenCoWebSiteOptionsEvent | undefined) {
        const iframeWindow = coWebsiteManager.loadCoWebsite(url, base, undefined, options?.allow, options);
        if (scriptWindow && iframeWindow) {
            const messgaeChannel = new MessageChannel()
            window.addEventListener("message", (event: MessageEvent) => {
                if (event.source === scriptWindow) {
                    iframeWindow.postMessage(event.data, "*")
                } else if (event.source === iframeWindow) {
                    (scriptWindow as Window).postMessage(event.data, "*")
                }
            })

            if (options?.passInputEvents) {
                const passToIframe = (e: Event) => {
                    const eventCopy: { [key: string]: unknown } = {
                        type: e.type
                    }
                    const eventPropertyDescriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(e));
                    for (const key in eventPropertyDescriptors) {
                        eventCopy[key] = eventPropertyDescriptors[key].get?.call(e)
                    }
                    iframeWindow?.postMessage({ type: "event-pass", data: eventCopy }, "*")
                }
                const passingEvents = ["keydown", "keypress", "keyup"] as const
                for (const eventType of passingEvents) {
                    window.addEventListener(eventType, passToIframe)
                    this.listeners.push({
                        listener: passToIframe,
                        type: eventType
                    })
                }


            }
        }
    }

    public closeCoWebSite() {
        for (const listener of this.listeners) {
            window.removeEventListener(listener.type, listener.listener)
        }
        this.listeners = []
        coWebsiteManager.closeCoWebsite();
    }
}

export const scriptUtils = new ScriptUtils();
