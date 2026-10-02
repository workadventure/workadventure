import type { Subscription } from "rxjs";
import Debug from "debug";
import * as Sentry from "@sentry/svelte";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import type { RoomConnection } from "../Connection/RoomConnection";
import type { ProximityChatRoomManager } from "../Chat/Connection/Proximity/ProximityChatRoomManager";

const debug = Debug("ProximitySpaceManager");

export class ProximitySpaceManager {
    private joinSpaceRequestMessageSubscription: Subscription;
    private leaveSpaceRequestMessageSubscription: Subscription;

    public constructor(
        roomConnection: RoomConnection,
        private proximityChatRoomManager: ProximityChatRoomManager,
    ) {
        this.joinSpaceRequestMessageSubscription = roomConnection.joinSpaceRequestMessage.subscribe(
            ({ spaceName, propertiesToSync }) => {
                this.proximityChatRoomManager.joinDefaultSpace(spaceName, propertiesToSync).catch((e) => {
                    if (e instanceof AbortError) {
                        debug("Join space aborted. The user left the space before finalizing the join", e);
                        return;
                    }
                    console.error(e);
                    Sentry.captureException(e);
                });
            },
        );

        this.leaveSpaceRequestMessageSubscription = roomConnection.leaveSpaceRequestMessage.subscribe(
            ({ spaceName }) => {
                this.proximityChatRoomManager.leaveDefaultSpace(spaceName).catch((e) => {
                    console.error("Error while leaving space", e);
                    Sentry.captureException(e);
                });
            },
        );
    }

    public destroy() {
        this.joinSpaceRequestMessageSubscription.unsubscribe();
        this.leaveSpaceRequestMessageSubscription.unsubscribe();
    }
}
