import { Subscription } from "rxjs";
import { RoomConnection } from "../Connection/RoomConnection";
import { ProximityChatConnection } from "../Chat/Connection/Proximity/ProximityChatConnection";

export class ProximitySpaceManager {
    private joinSpaceRequestMessageSubscription: Subscription;
    private leaveSpaceRequestMessageSubscription: Subscription;

    public constructor(
        private roomConnection: RoomConnection,
        private proximityChatConnection: ProximityChatConnection
    ) {
        this.joinSpaceRequestMessageSubscription = roomConnection.joinSpaceRequestMessage.subscribe(({ spaceName }) => {
            this.proximityChatConnection.joinSpace(spaceName, spaceName);
        });

        this.leaveSpaceRequestMessageSubscription = roomConnection.leaveSpaceRequestMessage.subscribe(
            ({ spaceName }) => {
                this.proximityChatConnection.leaveSpace(spaceName);
            }
        );
    }

    public destroy() {
        this.joinSpaceRequestMessageSubscription.unsubscribe();
        this.leaveSpaceRequestMessageSubscription.unsubscribe();
    }
}
