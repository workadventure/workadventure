import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { RoomConnection } from "../Connection/RoomConnection";
import { ProximityChatRoom } from "../Chat/Connection/Proximity/ProximityChatRoom";

export class ProximitySpaceManager {
    private joinSpaceRequestMessageSubscription: Subscription;
    private leaveSpaceRequestMessageSubscription: Subscription;

    public constructor(roomConnection: RoomConnection, private proximityChatRoom: ProximityChatRoom) {
        this.joinSpaceRequestMessageSubscription = roomConnection.joinSpaceRequestMessage.subscribe(
            ({ spaceName, propertiesToSync }) => {
                this.proximityChatRoom.joinSpace(spaceName, propertiesToSync).catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                });
            }
        );

        this.leaveSpaceRequestMessageSubscription = roomConnection.leaveSpaceRequestMessage.subscribe(
            ({ spaceName }) => {
                this.proximityChatRoom.leaveSpace(spaceName).catch((e) => {
                    console.error("Error while leaving space", e);
                    Sentry.captureException(e);
                });
            }
        );
    }

    public destroy() {
        this.joinSpaceRequestMessageSubscription.unsubscribe();
        this.leaveSpaceRequestMessageSubscription.unsubscribe();
    }
}
