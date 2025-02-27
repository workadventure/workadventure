import { Subscription } from "rxjs";
import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { availabilityStatusToJSON } from "@workadventure/messages";
import { RoomConnection } from "../../Connection/RoomConnection";
import { localUserStore } from "../../Connection/LocalUserStore";
import { followRoleStore, followStateStore, followUsersStore } from "../../Stores/FollowStore";
import { iframeListener } from "../../Api/IframeListener";
import { RemotePlayersRepository } from "./RemotePlayersRepository";

export class FollowManager {
    private subscriptions: Subscription[] = [];

    constructor(private connection: RoomConnection, private remotePlayersRepository: RemotePlayersRepository) {
        this.subscriptions.push(
            this.connection.followRequestMessageStream.subscribe((followRequestMessage) => {
                if (!localUserStore.getIgnoreFollowRequests()) {
                    if (followRequestMessage.forceFollow) {
                        // If forceFollow, we emit directly back the followConfirmationMessage
                        followUsersStore.addFollowRequest(followRequestMessage.leader);
                        followStateStore.set("active");
                        this.connection.emitFollowConfirmation(get(followUsersStore)[0]);
                    } else {
                        followUsersStore.addFollowRequest(followRequestMessage.leader);
                    }
                }
            })
        );

        this.subscriptions.push(
            this.connection.followConfirmationMessageStream.subscribe((followConfirmationMessage) => {
                followUsersStore.addFollower(followConfirmationMessage.follower);
                const remoteFollower = this.remotePlayersRepository
                    .getPlayers()
                    .get(followConfirmationMessage.follower);
                if (remoteFollower) {
                    iframeListener.sendFollowedEvent({
                        playerId: followConfirmationMessage.follower,
                        name: remoteFollower.name,
                        position: remoteFollower.position,
                        availabilityStatus: availabilityStatusToJSON(remoteFollower.availabilityStatus),
                        outlineColor: remoteFollower.outlineColor,
                        userUuid: remoteFollower.userUuid,
                        variables: remoteFollower.variables,
                    });
                } else {
                    console.warn(
                        "Received followConfirmationMessage for unknown player",
                        followConfirmationMessage.follower
                    );
                    Sentry.captureMessage("Received followConfirmationMessage for unknown player");
                }
            })
        );

        this.subscriptions.push(
            this.connection.followAbortMessageStream.subscribe((followAbortMessage) => {
                if (get(followRoleStore) === "follower") {
                    followUsersStore.stopFollowing();
                } else {
                    followUsersStore.removeFollower(followAbortMessage.follower);
                    const remoteFollower = this.remotePlayersRepository.getPlayers().get(followAbortMessage.follower);
                    if (remoteFollower) {
                        iframeListener.sendUnfollowedEvent({
                            playerId: followAbortMessage.follower,
                            name: remoteFollower.name,
                            position: remoteFollower.position,
                            availabilityStatus: availabilityStatusToJSON(remoteFollower.availabilityStatus),
                            outlineColor: remoteFollower.outlineColor,
                            userUuid: remoteFollower.userUuid,
                            variables: remoteFollower.variables,
                        });
                    } else {
                        console.warn("Received followAbortMessage for unknown player", followAbortMessage.follower);
                        Sentry.captureMessage("Received followAbortMessage for unknown player");
                    }
                }
            })
        );

        iframeListener.registerAnswerer("followMe", () => {
            this.connection?.emitFollowRequest(true);
        });

        iframeListener.registerAnswerer("stopLeading", () => {
            this.connection?.emitFollowAbort();
            followUsersStore.stopFollowing();
        });
    }

    public close() {
        if (get(followStateStore) !== "off") {
            this.connection?.emitFollowAbort();
        }
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
        iframeListener.unregisterAnswerer("followMe");
        iframeListener.unregisterAnswerer("stopLeading");
        followUsersStore.stopFollowing();
        followStateStore.set("off");
    }
}
