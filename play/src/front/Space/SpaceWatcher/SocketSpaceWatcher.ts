import { z } from "zod";
import { get } from "svelte/store";
import { Subscription } from "rxjs";
import { SpaceProviderInterface } from "../SpaceProvider/SpaceProviderInterface";
import { ChatConnectionInterface } from "../../Chat/Connection/ChatConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { proximityRoomConnection } from "../../Chat/Stores/ChatStore";
import { WORLD_SPACE_NAME } from "../Space";
import { RoomConnection } from "../../Connection/RoomConnection";

export enum SpaceEvent {
    AddSpaceUser = "addSpaceUserMessage",
    UpdateSpaceUser = "updateSpaceUserMessage",
    RemoveSpaceUser = "removeSpaceUserMessage",
    updateSpaceMetadata = "updateSpaceMetadataMessage",
}
export class StreamSpaceWatcher {
    private addSpaceUserMessageStreamSubscription: Subscription;
    private updateSpaceUserMessageStreamSubscription: Subscription;
    private removeSpaceUserMessageStreamSubscription: Subscription;
    private updateSpaceMetadataMessageStreamSubscription: Subscription;
    constructor(
        roomConnection: RoomConnection,
        spaceProvider: SpaceProviderInterface,

        // FIXME: chatConnection has absolutely nothing to do here IMHO
        // If anything, it should subscribe to even OUTSIDE this class
        chatConnection: ChatConnectionInterface = gameManager.getCurrentGameScene().chatConnection
    ) {
        this.addSpaceUserMessageStreamSubscription = roomConnection.addSpaceUserMessageStream.subscribe((message) => {
            if (!message.user || !message.filterName) return;

            spaceProvider
                .get(message.spaceName)
                .getSpaceFilter(message.filterName)
                .addUser(message.user)
                .then((extendedUser) => {
                    if (message.spaceName === WORLD_SPACE_NAME) chatConnection.addUserFromSpace(extendedUser);
                })
                .catch((e) => console.error(e));
        });

        this.updateSpaceUserMessageStreamSubscription = roomConnection.updateSpaceUserMessageStream.subscribe(
            (message) => {
                if (!message.user || !message.filterName) return;

                spaceProvider.get(message.spaceName).getSpaceFilter(message.filterName).updateUserData(message.user);

                // FIXME: this exception case is most certainly wrong. We need to listen to the space instead!
                if (message.spaceName === WORLD_SPACE_NAME) chatConnection.updateUserFromSpace(message.user);
                // FIXME: this exception case is most certainly wrong. We need to listen to the space instead!
                get(proximityRoomConnection)?.updateUserFromSpace(message.user);
            }
        );

        this.removeSpaceUserMessageStreamSubscription = roomConnection.removeSpaceUserMessageStream.subscribe(
            (message) => {
                if (!message.userId || !message.filterName) return;

                spaceProvider.get(message.spaceName).getSpaceFilter(message.filterName).removeUser(message.userId);

                // FIXME: this exception case is most certainly wrong. We need to listen to the space instead!
                if (message.spaceName === WORLD_SPACE_NAME) chatConnection.disconnectSpaceUser(message.userId);
                // FIXME: this exception case is most certainly wrong. We need to listen to the space instead!
                get(proximityRoomConnection)?.disconnectSpaceUser(message.userId);
            }
        );

        this.updateSpaceMetadataMessageStreamSubscription = roomConnection.updateSpaceMetadataMessageStream.subscribe(
            (message) => {
                const isMetadata = z.record(z.string(), z.unknown()).safeParse(JSON.parse(message.metadata));
                if (!isMetadata.success) {
                    console.error("Error while parsing metadata", isMetadata.error);
                    return;
                }
                const metadata: Map<string, unknown> = new Map();
                for (const [key, value] of Object.entries(isMetadata.data)) {
                    metadata.set(key, value);
                }

                if (message.metadata) spaceProvider.get(message.spaceName).setMetadata(metadata);
            }
        );
    }

    public destroy() {
        this.addSpaceUserMessageStreamSubscription.unsubscribe();
        this.updateSpaceUserMessageStreamSubscription.unsubscribe();
        this.removeSpaceUserMessageStreamSubscription.unsubscribe();
        this.updateSpaceMetadataMessageStreamSubscription.unsubscribe();
    }
}
