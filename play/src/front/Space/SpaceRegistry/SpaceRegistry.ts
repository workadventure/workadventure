import * as Sentry from "@sentry/svelte";
import { Subscription } from "rxjs";
import { z } from "zod";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space } from "../Space";
import { RoomConnection } from "../../Connection/RoomConnection";
import { connectionManager } from "../../Connection/ConnectionManager";
import { SpaceRegistryInterface } from "./SpaceRegistryInterface";

/**
 * The subset of properties of RoomConnection that are used by the SpaceRegistry / Space / SpaceFilter class.
 * This interface has a single purpose: making the creation of test doubles easier in unit tests.
 */
export type RoomConnectionForSpacesInterface = Pick<
    RoomConnection,
    | "addSpaceUserMessageStream"
    | "updateSpaceUserMessageStream"
    | "removeSpaceUserMessageStream"
    | "updateSpaceMetadataMessageStream"
    | "spacePublicMessageEvent"
    | "spacePrivateMessageEvent"
    | "emitPrivateSpaceEvent"
    | "emitPublicSpaceEvent"
    | "emitRemoveSpaceFilter"
    | "emitAddSpaceFilter"
    | "emitUpdateSpaceFilter"
    | "emitLeaveSpace"
    | "emitJoinSpace"
    | "emitUpdateSpaceMetadata"
    | "emitUpdateSpaceUserMessage"
    | "spaceDestroyedMessage"
>;

/**
 * This class is in charge of creating, joining, leaving and deleting Spaces.
 * It acts both as a factory and a registry.
 */
export class SpaceRegistry implements SpaceRegistryInterface {
    private spaces: Map<string, Space> = new Map<string, Space>();
    private addSpaceUserMessageStreamSubscription: Subscription;
    private updateSpaceUserMessageStreamSubscription: Subscription;
    private removeSpaceUserMessageStreamSubscription: Subscription;
    private updateSpaceMetadataMessageStreamSubscription: Subscription;
    private proximityPublicMessageEventSubscription: Subscription;
    private proximityPrivateMessageEventSubscription: Subscription;
    private spaceDestroyedMessageSubscription: Subscription;
    private roomConnectionStreamSubscription: Subscription;
    constructor(
        private roomConnection: RoomConnectionForSpacesInterface,
        private connectStream = connectionManager.roomConnectionStream
    ) {
        this.addSpaceUserMessageStreamSubscription = roomConnection.addSpaceUserMessageStream.subscribe((message) => {
            if (!message.user || !message.filterName) {
                console.error(message);
                throw new Error("addSpaceUserMessage is missing a user or a filterName");
            }

            this.spaces
                .get(message.spaceName)
                ?.getSpaceFilter(message.filterName)
                .addUser(message.user)
                .catch((e) => console.error(e));
        });

        this.updateSpaceUserMessageStreamSubscription = roomConnection.updateSpaceUserMessageStream.subscribe(
            (message) => {
                if (!message.user || !message.filterName || !message.updateMask) {
                    throw new Error("updateSpaceUserMessage is missing a user or a filterName or an updateMask");
                }

                this.spaces
                    .get(message.spaceName)
                    ?.getSpaceFilter(message.filterName)
                    .updateUserData(message.user, message.updateMask);
            }
        );

        this.removeSpaceUserMessageStreamSubscription = roomConnection.removeSpaceUserMessageStream.subscribe(
            (message) => {
                if (!message.spaceUserId || !message.filterName) {
                    throw new Error("removeSpaceUserMessage is missing a spaceUserId or a filterName");
                }

                this.spaces.get(message.spaceName)?.getSpaceFilter(message.filterName).removeUser(message.spaceUserId);
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

                if (message.metadata) {
                    this.spaces.get(message.spaceName)?.setMetadata(metadata);
                }
            }
        );

        this.proximityPublicMessageEventSubscription = roomConnection.spacePublicMessageEvent.subscribe((message) => {
            const space = this.spaces.get(message.spaceName);
            if (!space) {
                console.warn(
                    `Received a public message for a space that does not exist: "${message.spaceName}". This should not happen unless the space was left a few milliseconds before.`
                );
                return;
            }
            space.dispatchPublicMessage(message);
        });

        this.proximityPrivateMessageEventSubscription = roomConnection.spacePrivateMessageEvent.subscribe((message) => {
            const space = this.spaces.get(message.spaceName);
            if (!space) {
                console.warn(
                    `Received a private message for a space that does not exist: "${message.spaceName}". This should not happen unless the space was left a few milliseconds before.`
                );
                return;
            }
            space.dispatchPrivateMessage(message);
        });

        this.spaceDestroyedMessageSubscription = roomConnection.spaceDestroyedMessage.subscribe((message) => {
            console.error(`Space ${message.spaceName} destroyed. Something went wrong server-side.`);
            Sentry.captureException(
                new Error(`Space ${message.spaceName} destroyed. Something went wrong server-side.`)
            );

            // TODO: implement a retry mechanism.
        });

        this.roomConnectionStreamSubscription = this.connectStream.subscribe((connection) => {
            this.reconnect(connection);
        });
    }

    joinSpace(spaceName: string, metadata: Map<string, unknown> = new Map<string, unknown>()): SpaceInterface {
        if (this.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);
        const newSpace = new Space(spaceName, metadata, this.roomConnection);
        this.spaces.set(newSpace.getName(), newSpace);
        return newSpace;
    }
    exist(spaceName: string): boolean {
        return this.spaces.has(spaceName);
    }
    leaveSpace(space: SpaceInterface): void {
        const spaceName = space.getName();
        const spaceInRegistry = this.spaces.get(spaceName);
        if (!spaceInRegistry) {
            throw new SpaceDoesNotExistError(spaceName);
        }
        spaceInRegistry.destroy();
        this.spaces.delete(spaceName);
    }
    getAll(): SpaceInterface[] {
        return Array.from(this.spaces.values());
    }
    get(spaceName: string): SpaceInterface {
        const space: SpaceInterface | undefined = this.spaces.get(spaceName);
        if (!space) {
            throw new SpaceDoesNotExistError(spaceName);
        }
        return space;
    }

    reconnect(connection: RoomConnectionForSpacesInterface) {
        this.roomConnection = connection;
        this.spaces.forEach((space) => {
            this.leaveSpace(space);
            const newSpace = new Space(space.getName(), space.getMetadata(), this.roomConnection);
            this.spaces.set(newSpace.getName(), newSpace);
        });
    }

    destroy() {
        this.addSpaceUserMessageStreamSubscription.unsubscribe();
        this.updateSpaceUserMessageStreamSubscription.unsubscribe();
        this.removeSpaceUserMessageStreamSubscription.unsubscribe();
        this.updateSpaceMetadataMessageStreamSubscription.unsubscribe();
        this.proximityPublicMessageEventSubscription.unsubscribe();
        this.proximityPrivateMessageEventSubscription.unsubscribe();
        this.spaceDestroyedMessageSubscription.unsubscribe();
        this.roomConnectionStreamSubscription.unsubscribe();

        // Technically, all spaces should have been destroyed by now.
        // If a space is not destroyed, it means that there is a bug in the code.
        for (const space of this.spaces.values()) {
            space.destroy();
            console.warn(`Space "${space.getName()}" was not destroyed properly.`);
            Sentry.captureException(new Error(`Space "${space.getName()}" was not destroyed properly.`));
        }
        this.spaces.clear();
    }
}
