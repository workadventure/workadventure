import { queryWorkadventure } from "./IframeApiContribution.ts";
import { apiCallback } from "./registeredCallbacks.ts";
import { AbstractWorkadventureEventCommands } from "./AbstractEvent.ts";

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

    broadcast(name: string, data: unknown): Promise<void> {
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
                name,
                data,
            },
        });
    }
}

export default new WorkadventureEventCommands();
