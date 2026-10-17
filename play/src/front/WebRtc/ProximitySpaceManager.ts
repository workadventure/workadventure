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
    /**
     * Joins not finished yet, by space name. Joins and leaves are queued on the same lock and a join waits for
     * a peer to show up (getFirstUsers), so the leave of a bubble that dissolved before we joined it must abort
     * the join: otherwise that leave, and every bubble queued behind it, waits 9s for the getFirstUsers backstop.
     */
    private readonly pendingJoins = new Map<string, AbortController>();

    public constructor(
        roomConnection: RoomConnection,
        private proximityChatRoomManager: ProximityChatRoomManager,
    ) {
        this.joinSpaceRequestMessageSubscription = roomConnection.joinSpaceRequestMessage.subscribe(
            ({ spaceName, propertiesToSync }) => {
                const abortController = new AbortController();
                this.pendingJoins.set(spaceName, abortController);
                this.proximityChatRoomManager
                    .joinDefaultSpace(spaceName, propertiesToSync, abortController.signal)
                    .catch((e) => {
                        // An aborted join may reject with the signal's DOMException rather than an AbortError.
                        if (e instanceof AbortError || abortController.signal.aborted) {
                            debug("Join space aborted. The user left the space before finalizing the join", e);
                            return;
                        }
                        console.error(e);
                        Sentry.captureException(e);
                    })
                    .finally(() => {
                        if (this.pendingJoins.get(spaceName) === abortController) {
                            this.pendingJoins.delete(spaceName);
                        }
                    });
            },
        );

        this.leaveSpaceRequestMessageSubscription = roomConnection.leaveSpaceRequestMessage.subscribe(
            ({ spaceName }) => {
                this.pendingJoins.get(spaceName)?.abort(new AbortError("Left the bubble before it was joined"));
                this.pendingJoins.delete(spaceName);
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
