import type { Room } from "matrix-js-sdk";
import { EventType, EventTimeline } from "matrix-js-sdk";
import type { Readable, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import { KnownMembership } from "matrix-js-sdk/lib/types";

import * as Sentry from "@sentry/svelte";
import { MapStore } from "@workadventure/store-utils";
import { Deferred } from "@workadventure/shared-utils";
import { matrixRateLimiter } from "../../Services/MatrixRateLimiter";
import { ignoredSuggestedRoomIdsStore } from "../../Stores/ChatStore";
import type { RoomFolder } from "../ChatConnection";
import { MatrixChatRoom } from "./MatrixChatRoom";
import { hasValidViaEntries } from "./MatrixSpaceRelations";

export class MatrixRoomFolder extends MatrixChatRoom implements RoomFolder {
    roomList: MapStore<MatrixChatRoom["id"], MatrixChatRoom> = new MapStore<MatrixChatRoom["id"], MatrixChatRoom>();
    folderList: MapStore<MatrixRoomFolder["id"], MatrixRoomFolder> = new MapStore<
        MatrixRoomFolder["id"],
        MatrixRoomFolder
    >();

    readonly rooms: Readable<MatrixChatRoom[]>;
    readonly invitations: Readable<MatrixChatRoom[]>;
    readonly folders: Readable<RoomFolder[]>;
    readonly availableRooms: Writable<{ name: string; id: string; avatarUrl: string }[]> = writable([]);
    readonly hasChildRoomsError: Writable<boolean> = writable(false);
    readonly allSuggestedRooms: Writable<{ name: string; id: string; avatarUrl: string }[]> = writable([]);
    readonly suggestedRooms: Readable<{ name: string; id: string; avatarUrl: string }[]>;
    readonly joinableRooms: Readable<{ name: string; id: string; avatarUrl: string }[]>;
    readonly joinableRoomsLoading: Writable<boolean> = writable(false);

    private loadRoomsAndFolderPromise = new Deferred<void>();
    private joinRoomDeferred = new Deferred<void>();
    private childrenLoaded = false;
    private joinableRoomsLoaded = false;
    private joinableRoomsLoadingPromise: Promise<void> | undefined;

    constructor(private room: Room) {
        super(room);
        this.invitations = derived(
            [
                this.roomList,
                this.folderList,
                ...Array.from(this.roomList.values()).map((room) => room.myMembership),
                ...Array.from(this.folderList.values()).map((folder) => folder.myMembership),
            ],
            (_) => {
                return [
                    ...Array.from(this.roomList.values()).filter(
                        (room) => get(room.myMembership) === KnownMembership.Invite
                    ),
                    ...Array.from(this.folderList.values()).filter(
                        (folder) => get(folder.myMembership) === KnownMembership.Invite
                    ),
                ];
            }
        );

        this.rooms = derived(
            [this.roomList, ...Array.from(this.roomList.values()).map((room) => room.myMembership)],
            (_) => {
                return [
                    ...Array.from(this.roomList.values()).filter(
                        (room) => get(room.myMembership) === KnownMembership.Join
                    ),
                ];
            }
        );

        this.folders = derived(
            [this.folderList, ...Array.from(this.folderList.values()).map((folder) => folder.myMembership)],
            (_) => {
                return [
                    ...Array.from(this.folderList.values()).filter(
                        (folder) => get(folder.myMembership) === KnownMembership.Join
                    ),
                ];
            }
        );

        this.suggestedRooms = derived(
            [this.allSuggestedRooms, this.rooms, this.invitations, this.folders, ignoredSuggestedRoomIdsStore],
            ([$allSuggestedRooms, $rooms, $invitations, $folders, $ignoredIds]) => {
                const existingIds = new Set([
                    ...$rooms.map((room) => room.id),
                    ...$invitations.map((room) => room.id),
                    ...$folders.map((folder) => folder.id),
                ]);
                return $allSuggestedRooms.filter((room) => !existingIds.has(room.id) && !$ignoredIds.has(room.id));
            }
        );

        this.joinableRooms = derived(
            [this.availableRooms, ignoredSuggestedRoomIdsStore],
            ([$allChildRooms, $ignoredIds]) => $allChildRooms.filter((room) => !$ignoredIds.has(room.id))
        );

        if (get(this.myMembership) === KnownMembership.Join) this.joinRoomDeferred.resolve();
    }

    override destroy(): void {
        for (const id of Array.from(this.folderList.keys())) {
            this.folderList.get(id)?.destroy();
            this.folderList.delete(id);
        }
        for (const id of Array.from(this.roomList.keys())) {
            this.roomList.get(id)?.destroy();
            this.roomList.delete(id);
        }
        super.destroy();
    }

    init() {
        try {
            this.loadRoomsAndFolderPromise.resolve();
        } catch (e) {
            this.loadRoomsAndFolderPromise.reject(e);
            Sentry.captureException(e);
        }
    }
    async getNode(id: string): Promise<MatrixRoomFolder | MatrixChatRoom | undefined> {
        try {
            await this.loadRoomsAndFolderPromise.promise;

            const roomNode = this.roomList.get(id);
            if (roomNode) {
                return roomNode;
            }
            const folderNode = this.folderList.get(id);

            if (folderNode) {
                return folderNode;
            }

            const getNodePromise = Array.from(this.folderList.values()).map((folder) => {
                return folder.getNode(id);
            });

            const nodes = await Promise.all(getNodePromise);

            const node = nodes.filter((value) => value)[0];

            if (!node) {
                return undefined;
            }

            return node;
        } catch (e) {
            console.error("Failed to get node:", e);
            Sentry.captureException(e);
            return undefined;
        }
    }

    async deleteNode(id: string): Promise<boolean> {
        try {
            await this.loadRoomsAndFolderPromise.promise;
            const roomNode = this.roomList.get(id);
            if (roomNode) {
                roomNode.destroy();
                return this.roomList.delete(id);
            }

            const folderNode = this.folderList.get(id);
            if (folderNode) {
                folderNode.destroy();
                return this.folderList.delete(id);
            }

            const deleteNodePromise = Array.from(this.folderList.values()).map((folder) => {
                return folder.deleteNode(id);
            });

            const responses = await Promise.all(deleteNodePromise);

            return responses.some((response) => response);
        } catch (e) {
            console.error("Failed to delete node:", e);
            Sentry.captureException(e);
        }

        return false;
    }

    async getParentOfNode(id: string): Promise<MatrixRoomFolder | undefined> {
        try {
            await this.loadRoomsAndFolderPromise.promise;
            const roomNode = this.roomList.get(id);
            if (roomNode) {
                return this;
            }
            const folderNode = this.folderList.get(id);

            if (folderNode) {
                return this;
            }

            const getParentOfNodePromise = Array.from(this.folderList.values()).map((folder) => {
                return folder.getParentOfNode(id);
            });

            const parentFolders = await Promise.all(getParentOfNodePromise);

            const parentFolder = parentFolders.filter((value) => value)[0];

            if (!parentFolder) return undefined;

            return parentFolder;
        } catch (e) {
            console.error("Failed to get parent folder:", e);
            Sentry.captureException(e);
        }

        return undefined;
    }

    async getRoomsIdInNode(): Promise<string[]> {
        try {
            await this.loadRoomsAndFolderPromise.promise;

            const roomIDs = Array.from(this.roomList.keys());
            const folders = this.folderList;
            const foldersID = Array.from(this.roomList.keys());

            const nestedRoomIDs = await Promise.all(
                Array.from(folders.values()).map((folder) => folder.getRoomsIdInNode())
            );

            return [...roomIDs, ...foldersID, ...nestedRoomIDs.flat()];
        } catch (error) {
            console.error("Error fetching room IDs:", error);
            return [];
        }
    }

    async refreshFolderHierarchy() {
        await this.joinRoomDeferred.promise;
        const childEvents = this.room
            .getLiveTimeline()
            ?.getState(EventTimeline.FORWARDS)
            ?.getStateEvents(EventType.SpaceChild);

        childEvents
            ?.filter((childEvent) => hasValidViaEntries(childEvent.getContent()))
            .forEach((childEvent) => {
                const roomId = childEvent.event.state_key;
                const childRoom = this.room.client.getRoom(roomId);

                if (!childRoom || roomId === this.id) return;

                if (childRoom.isSpaceRoom()) {
                    this.folderList.set(childRoom.roomId, new MatrixRoomFolder(childRoom));
                } else {
                    const matrixChatRoom = new MatrixChatRoom(childRoom);
                    if (
                        get(matrixChatRoom.myMembership) === KnownMembership.Join ||
                        get(matrixChatRoom.myMembership) === KnownMembership.Invite
                    ) {
                        this.roomList.set(childRoom.roomId, matrixChatRoom);
                    }
                }
            });
    }

    async refreshRooms() {
        try {
            const { rooms: allRooms } = await matrixRateLimiter.getRoomHierarchy(this.room, 100, 1, false);

            const { rooms: suggestedRoomsData } = await matrixRateLimiter.getRoomHierarchy(this.room, 100, 2, true);
            const localRooms = this.room.client.getRooms();

            const suggestedRooms: { name: string; id: string; avatarUrl: string }[] = [];
            const availableRooms: { name: string; id: string; avatarUrl: string }[] = [];

            suggestedRoomsData.forEach((room) => {
                const roomId = room.room_id;
                if (this.id === roomId) return;

                const chatRoom = localRooms.find((r) => r.roomId === roomId);

                if (!chatRoom) {
                    suggestedRooms.push({
                        name: room.name ?? "",
                        id: roomId,
                        avatarUrl: "",
                    });
                    return;
                }

                const avatarUrl = chatRoom.getAvatarUrl(chatRoom.client.baseUrl, 24, 24, "scale") ?? "";
                suggestedRooms.push({
                    name: room.name ?? "",
                    id: roomId,
                    avatarUrl,
                });
            });

            allRooms.forEach((room) => {
                const roomId = room.room_id;
                if (this.id === roomId) return;

                const chatRoom = localRooms.find((r) => r.roomId === roomId);
                if (!chatRoom) {
                    availableRooms.push({
                        name: room.name ?? "",
                        id: roomId,
                        avatarUrl: "",
                    });
                    return;
                }

                const membership = chatRoom.getMyMembership();

                if (membership !== "join" && membership !== "invite" && membership !== "ban") {
                    const avatarUrl = chatRoom.getAvatarUrl(chatRoom.client.baseUrl, 24, 24, "scale") ?? "";
                    availableRooms.push({
                        name: room.name ?? "",
                        id: roomId,
                        avatarUrl,
                    });
                }
            });

            if (get(this.allSuggestedRooms) != suggestedRooms) {
                this.allSuggestedRooms.set(suggestedRooms);
            }
            if (get(this.availableRooms) != availableRooms) {
                this.availableRooms.set(availableRooms);
            }
        } catch (error) {
            console.error("Failed to refresh rooms:", error);
            this.hasChildRoomsError.set(true);
            Sentry.captureException(error);
        }
    }

    async ensureJoinableRoomsLoaded(): Promise<void> {
        if (this.joinableRoomsLoaded) {
            return;
        }
        if (this.joinableRoomsLoadingPromise) {
            return this.joinableRoomsLoadingPromise;
        }

        this.joinableRoomsLoading.set(true);
        this.hasChildRoomsError.set(false);
        this.joinableRoomsLoadingPromise = this.refreshRooms()
            .then(() => {
                this.joinableRoomsLoaded = true;
            })
            .catch((error: unknown) => {
                this.hasChildRoomsError.set(true);
                throw error;
            })
            .finally(() => {
                this.joinableRoomsLoading.set(false);
                this.joinableRoomsLoadingPromise = undefined;
            });

        return this.joinableRoomsLoadingPromise;
    }

    protected override onRoomMyMembership(room: Room) {
        if (room.getMyMembership() === KnownMembership.Join) {
            this.joinRoomDeferred.resolve();
        }
        super.onRoomMyMembership(room);
    }

    public ensureChildrenLoaded(): void {
        if (this.childrenLoaded) {
            return;
        }
        this.getChildren();
    }

    public hasLoadedChildren(): boolean {
        return this.childrenLoaded;
    }

    public getChildren() {
        this.childrenLoaded = true;
        const client = this.room.client;
        const room = this.room;

        const childEvents = room
            ?.getLiveTimeline()
            ?.getState(EventTimeline.FORWARDS)
            ?.getStateEvents(EventType.SpaceChild);

        if (!childEvents) return;

        const children = childEvents
            .filter((ev) => hasValidViaEntries(ev.getContent()))
            .map((ev) => {
                const stateKey = ev.getStateKey();
                if (!stateKey) return null;

                const history = client.getRoomUpgradeHistory(stateKey);
                return history[history.length - 1];
            })
            .filter((room): room is Room => {
                if (!room) return false;
                return (
                    room.getMyMembership() === KnownMembership.Join || room.getMyMembership() === KnownMembership.Invite
                );
            });

        const childIds = new Set(children.map((c) => c.roomId));

        for (const id of Array.from(this.roomList.keys())) {
            if (!childIds.has(id)) {
                this.roomList.get(id)?.destroy();
                this.roomList.delete(id);
            }
        }
        for (const id of Array.from(this.folderList.keys())) {
            if (!childIds.has(id)) {
                this.folderList.get(id)?.destroy();
                this.folderList.delete(id);
            }
        }

        children.forEach((child) => {
            if (child.isSpaceRoom()) {
                let spaceFolder = this.folderList.get(child.roomId);
                if (!spaceFolder) {
                    spaceFolder = new MatrixRoomFolder(child);
                    this.folderList.set(child.roomId, spaceFolder);
                }
                spaceFolder.init();
            } else if (!this.roomList.has(child.roomId)) {
                this.roomList.set(child.roomId, new MatrixChatRoom(child));
            }
        });
    }
}
