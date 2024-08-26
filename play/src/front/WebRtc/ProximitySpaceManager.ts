import { Subscription } from "rxjs";
import { RoomConnection } from "../Connection/RoomConnection";
import { ProximityChatRoom } from "../Chat/Connection/Proximity/ProximityChatRoom";

export class ProximitySpaceManager {
    private joinSpaceRequestMessageSubscription: Subscription;
    private leaveSpaceRequestMessageSubscription: Subscription;

    public constructor(roomConnection: RoomConnection, private proximityChatRoom: ProximityChatRoom) {
        this.joinSpaceRequestMessageSubscription = roomConnection.joinSpaceRequestMessage.subscribe(({ spaceName }) => {
            this.proximityChatRoom.joinSpace(spaceName);
        });

        this.leaveSpaceRequestMessageSubscription = roomConnection.leaveSpaceRequestMessage.subscribe(
            ({ spaceName }) => {
                this.proximityChatRoom.leaveSpace(spaceName);
            }
        );
    }

    public destroy() {
        this.joinSpaceRequestMessageSubscription.unsubscribe();
        this.leaveSpaceRequestMessageSubscription.unsubscribe();
    }
}
