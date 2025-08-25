import * as Sentry from "@sentry/svelte";
import { FilterType } from "@workadventure/messages";
import { Subscription } from "rxjs";
import { z } from "zod";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space } from "../Space";
import { RoomConnection } from "../../Connection/RoomConnection";
import { connectionManager } from "../../Connection/ConnectionManager";
import { throttlingDetector as globalThrottlingDetector } from "../../Utils/ThrottlingDetector";
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
    | "emitLeaveSpace"
    | "emitJoinSpace"
    | "emitUpdateSpaceMetadata"
    | "emitUpdateSpaceUserMessage"
    | "spaceDestroyedMessage"
    | "emitRequestFullSync"
>;

/**
 * This class is in charge of creating, joining, leaving and deleting Spaces.
 * It acts both as a factory and a registry.
 */
export class SpaceRegistry implements SpaceRegistryInterface {
    private spaces: Map<string, Space> = new Map<string, Space>();
    private leavingSpacesPromises: Map<string, Promise<void>> = new Map<string, Promise<void>>();
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
        private connectStream = connectionManager.roomConnectionStream,
        private throttlingDetector = globalThrottlingDetector // ✅ Instance globale par défaut
    ) {
        this.addSpaceUserMessageStreamSubscription = roomConnection.addSpaceUserMessageStream.subscribe((message) => {
            if (!message.user) {
                console.error(message);
                throw new Error("addSpaceUserMessage is missing a user");
            }

            this.spaces
                .get(message.spaceName)
                ?.addUser(message.user)
                .catch((e) => console.error(e));
        });

        this.updateSpaceUserMessageStreamSubscription = roomConnection.updateSpaceUserMessageStream.subscribe(
            (message) => {
                if (!message.user || !message.updateMask) {
                    throw new Error("updateSpaceUserMessage is missing a user or an updateMask");
                }

                this.spaces.get(message.spaceName)?.updateUserData(message.user, message.updateMask);
            }
        );

        this.removeSpaceUserMessageStreamSubscription = roomConnection.removeSpaceUserMessageStream.subscribe(
            (message) => {
                if (!message.spaceUserId) {
                    throw new Error("removeSpaceUserMessage is missing a spaceUserId");
                }

                this.spaces.get(message.spaceName)?.removeUser(message.spaceUserId);
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
            // this.reconnect(connection).catch((e) => console.error(e));
        });

        this.setupThrottlingDetection();
    }

    async joinSpace(
        spaceName: string,
        filterType: FilterType,
        metadata: Map<string, unknown> = new Map<string, unknown>()
    ): Promise<SpaceInterface> {
        const leavingPromise = this.leavingSpacesPromises.get(spaceName);
        if (leavingPromise) {
            await leavingPromise;
        }
        if (this.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);
        const newSpace = await Space.create(spaceName, filterType, this.roomConnection, metadata);
        this.spaces.set(newSpace.getName(), newSpace);
        return newSpace;
    }
    exist(spaceName: string): boolean {
        return this.spaces.has(spaceName);
    }
    async leaveSpace(space: SpaceInterface): Promise<void> {
        const spaceName = space.getName();
        const spaceInRegistry = this.spaces.get(spaceName);
        if (!spaceInRegistry) {
            throw new SpaceDoesNotExistError(spaceName);
        }
        const leavingPromise = spaceInRegistry.destroy();
        this.leavingSpacesPromises.set(spaceName, leavingPromise);
        try {
            await leavingPromise;
        } finally {
            this.leavingSpacesPromises.delete(spaceName);
        }
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

    async reconnect(connection: RoomConnectionForSpacesInterface) {
        this.roomConnection = connection;
        const spacesArray = Array.from(this.spaces.values());
        await Promise.all(
            spacesArray.map(async (space) => {
                await this.leaveSpace(space);
                const newSpace = await Space.create(
                    space.getName(),
                    space.filterType,
                    this.roomConnection,
                    space.getMetadata()
                );
                this.spaces.set(newSpace.getName(), newSpace);
            })
        );
    }

    async destroy() {
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
        await Promise.all(
            Array.from(this.spaces.values()).map(async (space) => {
                await space.destroy();
                console.warn(`Space "${space.getName()}" was not destroyed properly.`);
                Sentry.captureException(new Error(`Space "${space.getName()}" was not destroyed properly.`));
            })
        );

        // Clear all spaces from the registry
        this.spaces.clear();

        // Stop throttling detection and clean up resources
        this.throttlingDetector.destroy();
    }

    private setupThrottlingDetection(): void {
        const recoverySubscription = this.throttlingDetector.recoveryTriggered$
            .pipe(debounceTime(1000), distinctUntilChanged())
            .subscribe(() => {
                console.info("[SpaceRegistry] 🎯 Recovery after throttling - resynchronizing Spaces");

                const spaces = this.getAll();
                spaces.forEach((space) => {
                    console.debug(`[SpaceRegistry] Resync space: ${space.getName()}`);
                    space.requestFullSync();
                });
            });

        // Optionally: Subscribe to all events for debugging purposes
        const eventsSubscription = this.throttlingDetector.events$.subscribe((event) => {
            console.debug(`[SpaceRegistry] Throttling event: ${event.type}`, event);
        });

        // Store subscriptions for cleanup
        this.roomConnectionStreamSubscription.add(recoverySubscription);
        this.roomConnectionStreamSubscription.add(eventsSubscription);
    }
}
