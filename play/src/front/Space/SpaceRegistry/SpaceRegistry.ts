import * as Sentry from "@sentry/svelte";
import type { FilterType } from "@workadventure/messages";
import type { Subscription } from "rxjs";
import { z } from "zod";
import { MapStore } from "@workadventure/store-utils";
import type { Readable } from "svelte/store";
import { derived } from "svelte/store";
import type { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import type { VideoBox } from "../Space";
import { Space } from "../Space";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { connectionManager } from "../../Connection/ConnectionManager";
import type { SpaceRegistryInterface } from "./SpaceRegistryInterface";
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

    constructor(
        private roomConnection: RoomConnectionForSpacesInterface,
        private connectStream = connectionManager.roomConnectionStream
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
    }
}
