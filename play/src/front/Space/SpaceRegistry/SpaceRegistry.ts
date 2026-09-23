import * as Sentry from "@sentry/svelte";
import type { FilterType, SpaceKind } from "@workadventure/messages";
import type { Subscription } from "rxjs";
import { z } from "zod";
import { MapStore } from "@workadventure/store-utils";
import type { Readable } from "svelte/store";
import { derived } from "svelte/store";
import type { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import type { VideoBox } from "../VideoBox";
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
    | "startRecording"
    | "stopRecording"
    | "emitUpdateSpaceMetadata"
    | "emitUpdateSpaceUserMessage"
    | "spaceDestroyedMessage"
    | "emitBackEvent"
    | "emitVideoQualityReport"
>;

// How long a space kept across a reconnection to the server waits for the new GameScene to join it again. Past that,
// the user is no longer in it (they walked out of the meeting room during the outage, say) and its media are closed.
// Matches the back's own grace period (DETACHED_USER_GRACE_MS).
const ORPHAN_GRACE_MS = 30_000;

/**
 * This class is in charge of creating, joining, leaving and deleting Spaces.
 * It acts both as a factory and a registry.
 */
export class SpaceRegistry implements SpaceRegistryInterface {
    private spaces: MapStore<string, Space> = new MapStore<string, Space>();
    public readonly spacesEligibleForRecording: Readable<Space[]>;
    private leavingSpacesPromises: Map<string, Promise<void>> = new Map<string, Promise<void>>();
    private joiningSpacesPromises: Map<string, Promise<Space>> = new Map<string, Promise<Space>>();
    private connectionSubscriptions: Subscription[] = [];
    // Set between suspend() and resume(): the server connection is gone, the spaces and their media are kept.
    private suspended = false;
    // Spaces kept across a reconnection to the server, that the new GameScene has not joined again yet (see resume).
    private orphans = new Map<string, ReturnType<typeof setTimeout>>();

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

        const stores = Array.from($spaces.values(), (space) => space.isStreamingVideoStore);
        return derived(stores, (list) => list.some(Boolean)).subscribe(set);
    });

    public readonly isLiveStreamingAudioStore: Readable<boolean> = derived(this.spaces, ($spaces, set) => {
        if ($spaces.size === 0) {
            set(false);
            return () => {};
        }

        const stores = Array.from($spaces.values(), (space) => space.isStreamingAudioStore);
        return derived(stores, (list) => list.some(Boolean)).subscribe(set);
    });

    public readonly shouldPublishScreenShareStore: Readable<boolean> = derived(this.spaces, ($spaces, set) => {
        if ($spaces.size === 0) {
            set(false);
            return () => {};
        }

        const stores = Array.from($spaces.values(), (space) => space.shouldPublishScreenShareStore);
        return derived(stores, (list) => list.some(Boolean)).subscribe(set);
    });

    constructor(
        private roomConnection: RoomConnectionForSpacesInterface,
        private connectStream = connectionManager.roomConnectionStream,
    ) {
        this.spacesEligibleForRecording = derived(this.spaces, ($spaces, set) => {
            const spaces = Array.from($spaces.values());

            if (spaces.length === 0) {
                set([]);
                return () => {};
            }

            return derived(
                spaces.map((space) => space.shouldDisplayRecordButton),
                (eligibilityBySpace) => spaces.filter((_, index) => eligibilityBySpace[index]),
            ).subscribe(set);
        });

        this.subscribeTo(roomConnection);
    }

    /**
     * The server connection is gone (a play or back restart) and the GameScene is about to be rebuilt: keep the
     * spaces and their media instead of destroying them, and hand this registry to the next scene (see resume). While
     * suspended, leaving a space keeps it: the scene being torn down leaves everything, the next one joins back
     * whatever it is still in.
     */
    public suspend(): void {
        this.suspended = true;
        this.unsubscribeFromConnection();
    }

    /**
     * Called by the next GameScene with its new connection. Every space kept is an orphan until the scene joins it
     * again (joinSpace adopts it, without tearing its media down); one that nobody joins again within
     * ORPHAN_GRACE_MS is left for good.
     */
    public resume(connection: RoomConnectionForSpacesInterface): void {
        this.suspended = false;
        this.roomConnection = connection;
        this.subscribeTo(connection);
        for (const space of this.spaces.values()) {
            space.rejoinThrough(connection);
            this.orphans.set(
                space.getName(),
                setTimeout(() => {
                    this.orphans.delete(space.getName());
                    this.leaveSpace(space).catch((e) => {
                        console.error("Error while leaving a space nobody joined again", e);
                        Sentry.captureException(e);
                    });
                }, ORPHAN_GRACE_MS),
            );
        }
    }

    private unsubscribeFromConnection(): void {
        for (const subscription of this.connectionSubscriptions) {
            subscription.unsubscribe();
        }
        this.connectionSubscriptions = [];
    }

    private subscribeTo(connection: RoomConnectionForSpacesInterface): void {
        this.connectionSubscriptions.push(
            connection.initSpaceUsersMessageStream.subscribe((message) => {
                if (!message.users) {
                    console.error(message);
                    throw new Error("initSpaceUsersMessage is missing users");
                }

                const space = this.spaces.get(message.spaceName);

                if (!space) {
                    console.error("Space does not exist", message.spaceName);
                    return;
                }

                space.initUsers(message.users);
                space.initMetadata(message.metadata);
            }),
        );

        this.connectionSubscriptions.push(
            connection.addSpaceUserMessageStream.subscribe((message) => {
                if (!message.user) {
                    console.error(message);
                    throw new Error("addSpaceUserMessage is missing a user");
                }

                this.spaces.get(message.spaceName)?.addUser(message.user);
            }),
        );

        this.connectionSubscriptions.push(
            connection.updateSpaceUserMessageStream.subscribe((message) => {
                if (!message.user || !message.updateMask) {
                    throw new Error("updateSpaceUserMessage is missing a user or an updateMask");
                }

                this.spaces.get(message.spaceName)?.updateUserData(message.user, message.updateMask);
            }),
        );

        this.connectionSubscriptions.push(
            connection.removeSpaceUserMessageStream.subscribe((message) => {
                if (!message.spaceUserId) {
                    throw new Error("removeSpaceUserMessage is missing a spaceUserId");
                }

                this.spaces.get(message.spaceName)?.removeUser(message.spaceUserId);
            }),
        );

        this.connectionSubscriptions.push(
            connection.updateSpaceMetadataMessageStream.subscribe((message) => {
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
            }),
        );

        this.connectionSubscriptions.push(
            connection.spacePublicMessageEvent.subscribe((message) => {
                const space = this.spaces.get(message.spaceName);
                if (!space) {
                    console.warn(
                        `Received a public message for a space that does not exist: "${message.spaceName}". This should not happen unless the space was left a few milliseconds before.`,
                    );
                    return;
                }
                space.dispatchPublicMessage(message);
            }),
        );

        this.connectionSubscriptions.push(
            connection.spacePrivateMessageEvent.subscribe((message) => {
                const space = this.spaces.get(message.spaceName);
                if (!space) {
                    console.warn(
                        `Received a private message for a space that does not exist: "${message.spaceName}". This should not happen unless the space was left a few milliseconds before.`,
                    );
                    return;
                }
                space.dispatchPrivateMessage(message);
            }),
        );

        this.connectionSubscriptions.push(
            connection.spaceDestroyedMessage.subscribe((message) => {
                console.error(`Space ${message.spaceName} destroyed. Something went wrong server-side.`);
                Sentry.captureException(
                    new Error(`Space ${message.spaceName} destroyed. Something went wrong server-side.`),
                );

                const space = this.spaces.get(message.spaceName);
                if (space) {
                    space.onDisconnect();
                }
            }),
        );
    }

    async joinSpace(
        spaceName: string,
        filterType: FilterType,
        propertiesToSync: string[],
        signal: AbortSignal,
        options?: {
            metadata?: Map<string, unknown>;
            // True if the user is allowed to start/stop recording in the space. Defaults to false.
            canRecord?: boolean;
            /**
             * What the space is, told to the back as well as kept here: a space that
             * declares nothing is nobody's meeting and nobody's broadcast, so the back
             * measures nothing in it.
             */
            spaceKind?: SpaceKind;
        },
    ): Promise<SpaceInterface> {
        const orphanTimeout = this.orphans.get(spaceName);
        if (orphanTimeout !== undefined) {
            // Kept across a reconnection to the server, and already joined again through the new connection
            clearTimeout(orphanTimeout);
            this.orphans.delete(spaceName);
            const space = this.spaces.get(spaceName);
            if (space) {
                if (options?.canRecord !== undefined) {
                    space.setCanRecord(options.canRecord);
                }
                return space;
            }
        }

        const leavingPromise = this.leavingSpacesPromises.get(spaceName);
        if (leavingPromise) {
            await leavingPromise;
        }

        // A join for the same space might already be in flight. Because Space.create() awaits a
        // server round-trip (emitJoinSpace), a naive "exist() check then create" straddles an await:
        // two rapid join attempts (e.g. quickly re-entering a meeting room) can both pass the
        // existence check, then the first registers the space and the second throws
        // SpaceAlreadyExistError (or silently overwrites it, leaking the first Space and leaving
        // remote users visible). We coalesce concurrent joins on the same name by reusing the
        // in-flight creation promise.
        const joiningPromise = this.joiningSpacesPromises.get(spaceName);
        if (joiningPromise) {
            return await joiningPromise;
        }

        if (this.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);

        // Reserve the space name synchronously (before the first await) so concurrent joins coalesce.
        const creationPromise = (async () => {
            const metadata = options?.metadata ?? new Map<string, unknown>();
            if (options?.spaceKind) {
                metadata.set("spaceKind", options.spaceKind);
            }
            const newSpace = await Space.create(spaceName, filterType, this.roomConnection, propertiesToSync, signal, {
                ...options,
                metadata,
            });
            this.spaces.set(newSpace.getName(), newSpace);
            if (options?.spaceKind) {
                newSpace.emitUpdateSpaceMetadata(new Map([["spaceKind", options.spaceKind]]));
            }
            return newSpace;
        })();
        this.joiningSpacesPromises.set(spaceName, creationPromise);

        try {
            return await creationPromise;
        } finally {
            this.joiningSpacesPromises.delete(spaceName);
        }
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
        if (this.suspended) {
            return;
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

    async destroy() {
        this.unsubscribeFromConnection();
        for (const timeout of this.orphans.values()) {
            clearTimeout(timeout);
        }
        this.orphans.clear();

        // Wait for any in-flight join to settle so it does not register a space after we have
        // iterated this.spaces below (which would leak it). allSettled because a join may reject.
        await Promise.allSettled(Array.from(this.joiningSpacesPromises.values()));
        this.joiningSpacesPromises.clear();

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
            }),
        );
    }
}
