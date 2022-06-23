/**
 * Lists the iframes that are "interested" in listening to a particular event and automatically dispatches the messages to those iframes.
 *
 * This class takes care of unregistering iframes when they are closed
 */
import { iframeListener } from "../../Api/IframeListener";
import { IframeResponseEvent } from "../../Api/Events/IframeEvent";

export class IframeEventDispatcher {
    private targets = new Set<MessageEventSource>();
    private unsubscribers = new Map<MessageEventSource, () => void>();

    public addIframe(source: MessageEventSource) {
        this.targets.add(source);
        this.unsubscribers.set(
            source,
            iframeListener.onIframeCloseEvent(source, () => {
                this.targets.delete(source);
                this.unsubscribers.delete(source);
            })
        );
    }

    public removeIframe(source: MessageEventSource) {
        this.targets.delete(source);
        this.unsubscribers.delete(source);
    }

    public cleanup() {
        for (const unsubscriber of this.unsubscribers.values()) {
            unsubscriber();
        }
        this.unsubscribers.clear();
        this.targets.clear();
    }

    /**
     * Sends the message... to all iframes listening for users.
     */
    public postMessage(message: IframeResponseEvent) {
        for (const iframe of this.targets) {
            iframe.postMessage(message, {
                targetOrigin: "*",
            });
        }
    }
}
