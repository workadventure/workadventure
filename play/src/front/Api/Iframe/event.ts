import { queryWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import { AbstractWorkadventureEventCommands } from "./AbstractEvent";

export class WorkadventureEventCommands extends AbstractWorkadventureEventCommands {
    public constructor() {
        super();
    }

    callbacks = [
        apiCallback({
            type: "receiveEvent",
            callback: (payloadData) => {
                this.receivedEventResolvers.next(payloadData);
            },
        }),
    ];

    dispatchEvent(key: string, value: unknown): Promise<void> {
        /*const subscriber = this.eventSubscribers.get(key);
        if (subscriber) {
            subscriber.next({
                key,
                value,
                senderId: WA.player.playerId,
            });
        }*/

        return queryWorkadventure({
            type: "dispatchEvent",
            data: {
                key,
                value,
            },
        });
    }
}

export default new WorkadventureEventCommands();
