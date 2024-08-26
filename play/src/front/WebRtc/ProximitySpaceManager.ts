import { Subscription } from "rxjs";
import { get } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { RoomConnection } from "../Connection/RoomConnection";
import { ProximityChatRoom } from "../Chat/Connection/Proximity/ProximityChatRoom";
import { isAChatRoomIsVisible, navChat, selectedRoom } from "../Chat/Stores/ChatStore";
import { availabilityStatusStore, mediaStreamConstraintsStore } from "../Stores/MediaStore";
import { chatVisibilityStore } from "../Stores/ChatStore";

export class ProximitySpaceManager {
    private joinSpaceRequestMessageSubscription: Subscription;
    private leaveSpaceRequestMessageSubscription: Subscription;

    public constructor(roomConnection: RoomConnection, private proximityChatRoom: ProximityChatRoom) {
        this.joinSpaceRequestMessageSubscription = roomConnection.joinSpaceRequestMessage.subscribe(({ spaceName }) => {
            this.proximityChatRoom.joinSpace(spaceName);

            const mediaStreamConstraints = get(mediaStreamConstraintsStore);

            if (!isAChatRoomIsVisible()) {
                selectedRoom.set(proximityChatRoom);
                navChat.set("chat");
                if (
                    !mediaStreamConstraints.audio &&
                    !mediaStreamConstraints.video &&
                    (get(availabilityStatusStore) === AvailabilityStatus.ONLINE ||
                        get(availabilityStatusStore) === AvailabilityStatus.AWAY)
                ) {
                    chatVisibilityStore.set(true);
                }
            }
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
