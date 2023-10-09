import type { RoomConnection } from "../../Connection/RoomConnection";
import { iframeListener } from "../../Api/IframeListener";
import { SendEventEvent } from "../../Api/Events/SendEventEvent";

/**
 * Provides a bridge between scripts and the pusher server for events.
 */
export class ScriptingEventsManager {
    constructor(private roomConnection: RoomConnection) {
        // The variableMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        roomConnection.receivedEventMessageStream.subscribe(({ key, value, senderId }) => {
            // On server change, let's notify the iframes
            iframeListener.dispatchReceivedEvent({
                key: key,
                value: value,
                senderId: senderId,
            });
        });

        iframeListener.registerAnswerer("dispatchEvent", (event: SendEventEvent, source) => {
            return this.dispatchEvent(event, source);
        });
    }

    public async dispatchEvent(event: SendEventEvent, source: MessageEventSource | null): Promise<void> {
        // Dispatch to the room connection.
        await this.roomConnection.emitScriptableEvent(event.key, event.value, event.targetUserIds);

        // Dispatch to other iframes (only if we are part of the targets)
        /*if (event.targetUserIds === undefined || event.targetUserIds.includes(this.roomConnection.getUserId())) {
            iframeListener.dispatchScriptableEventToOtherIframes(
                event.key,
                event.value,
                this.roomConnection.getUserId(),
                source
            );
        }*/
    }

    public close(): void {
        iframeListener.unregisterAnswerer("dispatchEvent");
    }
}
