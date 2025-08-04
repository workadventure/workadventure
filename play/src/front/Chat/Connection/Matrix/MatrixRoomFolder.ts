import { Room, EventType, EventTimeline } from "matrix-js-sdk";
import { derived, get, Readable, writable, Writable } from "svelte/store";
import { KnownMembership } from "matrix-js-sdk/lib/types";

import * as Sentry from "@sentry/svelte";
import { MapStore } from "@workadventure/store-utils";
import { Deferred } from "ts-deferred";
import { RoomFolder } from "../ChatConnection";
import { MatrixChatRoom } from "./MatrixChatRoom";

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

    private loadRoomsAndFolderPromise = new Deferred<void>();
    private joinRoomDeferred = new Deferred<void>();

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
            [this.allSuggestedRooms, this.rooms, this.invitations, this.folders],
            ([$allSuggestedRooms, $rooms, $invitations, $folders]) => {
                const existingIds = new Set([
                    ...$rooms.map((room) => room.id),
                    ...$invitations.map((room) => room.id),
                    ...$folders.map((folder) => folder.id),
                ]);
                return $allSuggestedRooms.filter((room) => !existingIds.has(room.id));
            }
        );

        this.joinableRooms = derived([this.availableRooms], ([$allChildRooms]) => $allChildRooms);

        if (get(this.myMembership) === KnownMembership.Join) this.joinRoomDeferred.resolve();
    }

    init() {
        try {
            if (get(this.myMembership) === KnownMembership.Join) {
                console.log("🚀🚀🚀 GetChildren");
                this.getChildren();
                this.refreshSuggestedRooms().catch((error) => {
                    console.error("Failed to refresh suggested rooms:", error);
                    Sentry.captureException(error);
                });
                this.hasChildRoomsError.set(false);
                this.refreshAllChildRooms().catch((error) => {
                    console.error("Failed to refresh all child rooms:", error);
                    this.hasChildRoomsError.set(true);
                    Sentry.captureException(error);
                });
            }
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
                return folder.getParentOfNode(id);
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
            const isDeletedInRoomList = this.roomList.delete(id);
            if (isDeletedInRoomList) {
                return true;
            }

            const isDeletedInFolderList = this.folderList.delete(id);
            if (isDeletedInFolderList) {
                return true;
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

            if (!parentFolder) throw new Error("Parent folder not found");

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

        childEvents?.forEach((childEvent) => {
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

    async refreshSuggestedRooms() {
        const { rooms } = await this.room.client.getRoomHierarchy(this.id, 100, 1, true);

        const allRooms = this.room.client.getRooms();

        const suggestedMatrixChatRooms: { name: string; id: string; avatarUrl: string }[] = [];

        rooms.forEach((room) => {
            const roomId = room.room_id;

            if (this.id === roomId) return;

            const chatRoom = allRooms.find((r) => r.roomId === roomId);

            if (!chatRoom) return;

            const avatarUrl = chatRoom?.getAvatarUrl(chatRoom.client.baseUrl, 24, 24, "scale") ?? undefined;

            if (!this.roomList.has(roomId) && !this.folderList.has(roomId)) {
                suggestedMatrixChatRooms.push({ name: room.name ?? "", id: roomId, avatarUrl: avatarUrl ?? "" });
            }
        });

        this.allSuggestedRooms.set(suggestedMatrixChatRooms);
    }

    async refreshAllChildRooms() {
        const { rooms } = await this.room.client.getRoomHierarchy(this.id, 100, 1, false);

        const allRooms = this.room.client.getRooms();

        console.trace("🚀🚀🚀 All rooms", rooms);

        const allMatrixChatRooms: { name: string; id: string; avatarUrl: string }[] = [];

        rooms.forEach((room) => {
            const roomId = room.room_id;
            if (this.id === roomId) return;

            const chatRoom = allRooms.find((r) => r.roomId === roomId);
            let isJoinOrInvite = false;
            if (chatRoom) {
                const membership = chatRoom.getMyMembership();
                if (membership === "join" || membership === "invite" || membership === "ban") {
                    isJoinOrInvite = true;
                }
            }
            if (!isJoinOrInvite) {
                const avatarUrl = chatRoom?.getAvatarUrl(chatRoom.client.baseUrl, 24, 24, "scale") ?? "";
                allMatrixChatRooms.push({ name: room.name ?? "", id: roomId, avatarUrl });
            }
        });

        this.availableRooms.set(allMatrixChatRooms);
    }

    protected override onRoomMyMembership(room: Room) {
        if (room.getMyMembership() === KnownMembership.Join) {
            this.joinRoomDeferred.resolve();
            this.getChildren();
            this.refreshSuggestedRooms().catch((error) => {
                console.error("Failed to refresh suggested rooms:", error);
                Sentry.captureException(error);
            });
            console.log("❄️❄️❄️ Call in onRoomMyMembership() ");
            // this.refreshAllChildRooms().catch((error) => {
            //     console.error("Failed to refresh all child rooms:", error);
            //     Sentry.captureException(error);
            // });
        }
        super.onRoomMyMembership(room);
    }

    public getChildren() {
        const client = this.room.client;
        const room = this.room;

        const childEvents = room
            ?.getLiveTimeline()
            ?.getState(EventTimeline.FORWARDS)
            ?.getStateEvents(EventType.SpaceChild);

        if (!childEvents) return;

        // let joinableRooms: { name: string; id: string; avatarUrl: string }[] = []
        //
        // childEvents.forEach((ev) => {
        //     const stateKey = ev.getStateKey();
        //     console.log(!stateKey ? "No state key for event" : "State key:", stateKey);
        //     if (!stateKey) return;
        //
        //     const room = client.getRoom(stateKey);
        //     // const room = history[history.length - 1];x
        //
        //     console.log(!room ? "❌ Room not found " : `✅Room found:${room.name}`);
        //
        //     if (!room) return;
        //
        //     if (room.getMyMembership() === KnownMembership.Join || room.getMyMembership() === KnownMembership.Invite) {
        //         console.log("🚗🚗 Room joined or invited, adding to room list");
        //         if (room.isSpaceRoom()) {
        //             const spaceFolder = new MatrixRoomFolder(room);
        //             this.folderList.set(room.roomId, spaceFolder);
        //             spaceFolder.init();
        //         } else {
        //             this.roomList.set(room.roomId, new MatrixChatRoom(room));
        //         }
        //     } else if (room.getMyMembership() !== KnownMembership.Ban) {
        //         console.log("🚗🚗🚗 Other room not joined or invited, adding to joinable rooms");
        //         const avatarUrl = room.getAvatarUrl(client.baseUrl, 24, 24, "scale") ?? "";
        //         console.log("adding room", room.name, room.roomId, avatarUrl);
        //         joinableRooms.push({ name: room.name ?? "", id: room.roomId, avatarUrl });
        //         console.log(" 😍😍😍Available rooms updated:", get(this.availableRooms));
        //     }
        //     this.availableRooms.set(joinableRooms)
        // });

        const children = childEvents
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

        children.forEach((child) => {
            if (child.isSpaceRoom()) {
                const spaceFolder = new MatrixRoomFolder(child);
                this.folderList.set(child.roomId, spaceFolder);
                spaceFolder.init();
            } else {
                this.roomList.set(child.roomId, new MatrixChatRoom(child));
            }
        });
    }
}
