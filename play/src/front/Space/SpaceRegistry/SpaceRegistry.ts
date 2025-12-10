import * as Sentry from "@sentry/svelte";
import { FilterType } from "@workadventure/messages";
import { Subscription } from "rxjs";
import { z } from "zod";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { MapStore } from "@workadventure/store-utils";
import { derived, Readable } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space, VideoBox } from "../Space";
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
    | "closed"
    | "initSpaceUsersMessageStream"
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
    | "emitBackEvent"
>;

/**
 * This class is in charge of creating, joining, leaving and deleting Spaces.
 * It acts both as a factory and a registry.
 */
export class SpaceRegistry implements SpaceRegistryInterface {
    private spaces: MapStore<string, Space> = new MapStore<string, Space>();
    private leavingSpacesPromises: Map<string, Promise<void>> = new Map<string, Promise<void>>();
    private initSpaceUsersMessageStreamSubscription: Subscription;
    private addSpaceUserMessageStreamSubscription: Subscription;
    private updateSpaceUserMessageStreamSubscription: Subscription;
    private removeSpaceUserMessageStreamSubscription: Subscription;
    private updateSpaceMetadataMessageStreamSubscription: Subscription;
    private proximityPublicMessageEventSubscription: Subscription;
    private proximityPrivateMessageEventSubscription: Subscription;
    private spaceDestroyedMessageSubscription: Subscription;
    private roomConnectionStreamSubscription: Subscription;

    public readonly videoStreamStore: Readable<Map<string, VideoBox>> = derived(this.spaces, ($spaces, set) => {
        if ($spaces.size === 0) {
            set(new Map());
            return () => {};
        }

        const spaceStores = Array.from($spaces.values()).map((space) => space.videoStreamStore);

        const combinedStore = derived(spaceStores, (allSpaceStreams) => {
            const aggregatedPeers = new Map<string, VideoBox>();

            allSpaceStreams.forEach((spaceStreams) => {
                spaceStreams.forEach((streamable, userId) => {
                    aggregatedPeers.set(userId, streamable);
                });
            });

            return aggregatedPeers;
        });

        const unsubscribe = combinedStore.subscribe((aggregatedPeers) => {
            set(new Map(aggregatedPeers));
        });

        return unsubscribe;
    });

    public readonly screenShareStreamStore: Readable<Map<string, VideoBox>> = derived(this.spaces, ($spaces, set) => {
        if ($spaces.size === 0) {
            set(new Map());
            return () => {};
        }

        const spaceStores = Array.from($spaces.values()).map((space) => space.screenShareStreamStore);

        const combinedStore = derived(spaceStores, (allSpaceStreams) => {
            const aggregatedPeers = new Map<string, VideoBox>();

            allSpaceStreams.forEach((spaceStreams) => {
                spaceStreams.forEach((streamable, userId) => {
                    aggregatedPeers.set(userId, streamable);
                });
            });

            return aggregatedPeers;
        });

        const unsubscribe = combinedStore.subscribe((aggregatedPeers) => {
            set(new Map(aggregatedPeers));
        });

        return unsubscribe;
    });

    public readonly isLiveStreamingStore: Readable<boolean> = derived(this.spaces, ($spaces, set) => {
        if ($spaces.size === 0) {
            set(false);
            return () => {};
        }

        const stores = Array.from($spaces.values(), (space) => space.isStreamingStore);
        return derived(stores, (list) => list.some(Boolean)).subscribe(set);

        /*const spaceStores = Array.from($spaces.values()).map((space) => space.isStreamingStore);

        const combinedStore = derived(spaceStores, (isStreamingList) => {
            return isStreamingList.some((isStreaming) => isStreaming);
        });

        const unsubscribe = combinedStore.subscribe((result) => {
            set(result);
        });

        return unsubscribe;*/
    });

    public readonly failedConnectionsStore: Readable<Set<string>> = derived(this.spaces, ($spaces, set) => {
        if ($spaces.size === 0) {
            set(new Set());
            return () => {};
        }

        const spaceStores = Array.from($spaces.values()).map((space) => space.failedConnectionsStore);

        const combinedStore = derived(spaceStores, (allFailedConnections) => {
            const aggregatedFailedConnections = new Set<string>();

            allFailedConnections.forEach((failedConnections) => {
                failedConnections.forEach((userId) => {
                    aggregatedFailedConnections.add(userId);
                });
            });

            return aggregatedFailedConnections;
        });

        const unsubscribe = combinedStore.subscribe((aggregatedFailedConnections) => {
            set(aggregatedFailedConnections);
        });

        return unsubscribe;
    });

    public readonly reconnectingConnectionsStore: Readable<Set<string>> = derived(this.spaces, ($spaces, set) => {
        if ($spaces.size === 0) {
            set(new Set());
            return () => {};
        }

        const spaceStores = Array.from($spaces.values()).map((space) => space.reconnectingConnectionsStore);

        const combinedStore = derived(spaceStores, (allReconnectingConnections) => {
            const aggregatedReconnectingConnections = new Set<string>();

            allReconnectingConnections.forEach((reconnectingConnections) => {
                reconnectingConnections.forEach((userId) => {
                    aggregatedReconnectingConnections.add(userId);
                });
            });

            return aggregatedReconnectingConnections;
        });

        const unsubscribe = combinedStore.subscribe((aggregatedReconnectingConnections) => {
            set(aggregatedReconnectingConnections);
        });

        return unsubscribe;
    });

    public readonly persistentIssueConnectionsStore: Readable<Set<string>> = derived(this.spaces, ($spaces, set) => {
        if ($spaces.size === 0) {
            set(new Set());
            return () => {};
        }

        const spaceStores = Array.from($spaces.values()).map((space) => space.persistentIssueConnectionsStore);

        const combinedStore = derived(spaceStores, (allPersistentIssueConnections) => {
            const aggregatedPersistentIssueConnections = new Set<string>();

            allPersistentIssueConnections.forEach((persistentIssueConnections) => {
                persistentIssueConnections.forEach((userId) => {
                    aggregatedPersistentIssueConnections.add(userId);
                });
            });

            return aggregatedPersistentIssueConnections;
        });

        const unsubscribe = combinedStore.subscribe((aggregatedPersistentIssueConnections) => {
            set(aggregatedPersistentIssueConnections);
        });

        return unsubscribe;
    });

    constructor(
        private roomConnection: RoomConnectionForSpacesInterface,
        private connectStream = connectionManager.roomConnectionStream,
        private throttlingDetector = globalThrottlingDetector
    ) {
        this.initSpaceUsersMessageStreamSubscription = roomConnection.initSpaceUsersMessageStream.subscribe(
            (message) => {
                if (!message.users) {
                    console.error(message);
                    throw new Error("initSpaceUsersMessage is missing users");
                }

                this.spaces.get(message.spaceName)?.initUsers(message.users);
            }
        );

        this.addSpaceUserMessageStreamSubscription = roomConnection.addSpaceUserMessageStream.subscribe((message) => {
            if (!message.user) {
                console.error(message);
                throw new Error("addSpaceUserMessage is missing a user");
            }

            this.spaces.get(message.spaceName)?.addUser(message.user);
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

                if (!message.metadata) {
                    return;
                }

                const space = this.spaces.get(message.spaceName);
                if (!space) {
                    console.error("Space does not exist", message.spaceName);
                    return;
                }

                space.setMetadata(metadata);
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

            const space = this.spaces.get(message.spaceName);
            if (space) {
                space.onDisconnect();
            }
        });

        this.roomConnectionStreamSubscription = this.connectStream.subscribe((connection) => {
            // this.reconnect(connection).catch((e) => console.error(e));
        });

        this.setupThrottlingDetection();
    }

    async joinSpace(
        spaceName: string,
        filterType: FilterType,
        propertiesToSync: string[],
        signal: AbortSignal,
        options?: {
            metadata: Map<string, unknown>;
        }
    ): Promise<SpaceInterface> {
        const leavingPromise = this.leavingSpacesPromises.get(spaceName);
        if (leavingPromise) {
            await leavingPromise;
        }

        if (this.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);
        const newSpace = await Space.create(
            spaceName,
            filterType,
            this.roomConnection,
            propertiesToSync,
            signal,
            options
        );
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

        const leavingPromise = this.performLeaveSpace(spaceInRegistry, spaceName);
        this.leavingSpacesPromises.set(spaceName, leavingPromise);

        try {
            await leavingPromise;
        } finally {
            this.leavingSpacesPromises.delete(spaceName);
        }
    }

    private async performLeaveSpace(spaceInRegistry: Space, spaceName: string): Promise<void> {
        await spaceInRegistry.destroy();
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

    /**
     * Retries all failed connections across all spaces
     */
    retryAllFailedConnections(): void {
        const allSpaces = this.getAll();
        console.log(`[SpaceRegistry] Retrying failed connections across ${allSpaces.length} space(s)`);

        for (const space of allSpaces) {
            // Space is actually a Space instance, so we can access retryAllFailedConnections
            const spaceInstance = space as Space;
            spaceInstance.retryAllFailedConnections();
        }
    }

    /*async reconnect(connection: RoomConnectionForSpacesInterface) {
        this.roomConnection = connection;
        const spacesArray = Array.from(this.spaces.values());
        await Promise.all(
            spacesArray.map(async (space) => {
                await this.leaveSpace(space);
                const newSpace = await Space.create(
                    space.getName(),
                    space.filterType,
                    this.roomConnection,
                    space.getPropertiesToSync(),
                    space.getMetadata()
                );
                this.spaces.set(newSpace.getName(), newSpace);
            })
        );
    }*/

    async destroy() {
        this.initSpaceUsersMessageStreamSubscription.unsubscribe();
        this.addSpaceUserMessageStreamSubscription.unsubscribe();
        this.updateSpaceUserMessageStreamSubscription.unsubscribe();
        this.removeSpaceUserMessageStreamSubscription.unsubscribe();
        this.updateSpaceMetadataMessageStreamSubscription.unsubscribe();
        this.proximityPublicMessageEventSubscription.unsubscribe();
        this.proximityPrivateMessageEventSubscription.unsubscribe();
        this.spaceDestroyedMessageSubscription.unsubscribe();
        this.roomConnectionStreamSubscription.unsubscribe();

        await Promise.all(Array.from(this.leavingSpacesPromises.values()));
        this.leavingSpacesPromises.clear();

        await Promise.all(
            Array.from(this.spaces.values()).map(async (space) => {
                try {
                    await space.destroy();
                } finally {
                    this.spaces.delete(space.getName());
                }
                console.warn(`Space "${space.getName()}" was not destroyed properly.`);
            })
        );

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
