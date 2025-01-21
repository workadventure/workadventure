import { Room } from "matrix-js-sdk/lib/matrix";
import { derived, get, Readable } from "svelte/store";
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

        if (get(this.myMembership) === KnownMembership.Join) this.joinRoomDeferred.resolve();
    }

    async init() {
        try {
            if (get(this.myMembership) === KnownMembership.Join) {
                await this.refreshFolderHierarchy();
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
        const { rooms: roomsHierarchy } = await this.room.client.getRoomHierarchy(this.id, 100, 1);

        roomsHierarchy.forEach((cur) => {
            const childRoom = this.room.client.getRoom(cur.room_id);

            if (!childRoom || cur.room_id === this.id) return;

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

    protected override async onRoomMyMembership(room: Room) {
        if (room.getMyMembership() === KnownMembership.Join) {
            this.joinRoomDeferred.resolve();
            await this.refreshFolderHierarchy();
        }
        super.onRoomMyMembership(room);
    }
}
