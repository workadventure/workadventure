import { Room } from "matrix-js-sdk/src/matrix";
import { Writable, writable } from "svelte/store";
import { KnownMembership } from "matrix-js-sdk/src/types";
import * as Sentry from "@sentry/svelte";
import { MapStore } from "@workadventure/store-utils";
import { RoomFolder } from "../ChatConnection";
import { MatrixChatRoom } from "./MatrixChatRoom";
export class MatrixRoomFolder implements RoomFolder {
    rooms: MapStore<MatrixChatRoom["id"], MatrixChatRoom> = new MapStore<MatrixChatRoom["id"], MatrixChatRoom>();
    folders: MapStore<MatrixRoomFolder["id"], MatrixRoomFolder> = new MapStore<
        MatrixRoomFolder["id"],
        MatrixRoomFolder
    >();

    id: string;
    name: Writable<string>;
    private loadRoomsAndFolderPromise: Promise<void>;

    constructor(private room: Room) {
        this.name = writable(room.name);
        this.id = room.roomId;

        this.loadRoomsAndFolderPromise = new Promise((resolve, reject) => {
            this.room.client
                .getRoomHierarchy(room.roomId, 100, 1)
                .then(({ rooms: roomsHierarchy }) => {
                    roomsHierarchy.forEach((cur) => {
                        const childRoom = room.client.getRoom(cur.room_id);

                        if (!childRoom || cur.room_id === this.id) return;

                        if (childRoom.isSpaceRoom()) {
                            this.folders.set(childRoom.roomId, new MatrixRoomFolder(childRoom));
                        } else {
                            const matrixChatRoom = new MatrixChatRoom(childRoom);
                            if (matrixChatRoom.myMembership === KnownMembership.Join) {
                                this.rooms.set(childRoom.roomId, matrixChatRoom);
                            }
                        }
                    });
                    resolve();
                })
                .catch((error) => {
                    console.error(error);
                    Sentry.captureMessage("Failed to get folder Hierarchy");
                    reject(new Error("Failed to get folder Hierarchy"));
                });
        });
    }

    getNode(id: string): MatrixRoomFolder | MatrixChatRoom | undefined {
        const roomNode = this.rooms.get(id);
        if (roomNode) {
            return roomNode;
        }
        const folderNode = this.folders.get(id);

        if (folderNode) {
            return folderNode;
        }

        for (const [, folder] of this.folders) {
            const node = folder.getNode(id);
            if (node) {
                return node;
            }
        }

        return undefined;
    }

    deleteNode(id: string): boolean {
        const isDeletedInRoomList = this.rooms.delete(id);
        if (isDeletedInRoomList) {
            return true;
        }

        const isDeletedInFolderList = this.folders.delete(id);
        if (isDeletedInFolderList) {
            return true;
        }

        for (const [, folder] of this.folders) {
            if (folder.deleteNode(id)) {
                return true;
            }
        }

        return false;
    }

    getParentOfNode(id: string): MatrixRoomFolder | undefined {
        const roomNode = this.rooms.get(id);
        if (roomNode) {
            return this;
        }
        const folderNode = this.folders.get(id);

        if (folderNode) {
            return this;
        }

        for (const [, folder] of this.folders) {
            const parentNode = folder.getParentOfNode(id);
            if (parentNode) {
                return parentNode;
            }
        }

        return undefined;
    }

    async getRoomsIdInNode(): Promise<string[]> {
        try {
            await this.loadRoomsAndFolderPromise;

            const roomIDs = Array.from(this.rooms.keys());
            const folders = this.folders;
            const foldersID = Array.from(this.rooms.keys());

            const nestedRoomIDs = await Promise.all(
                Array.from(folders.values()).map((folder) => folder.getRoomsIdInNode())
            );

            return [...roomIDs, ...foldersID, ...nestedRoomIDs.flat()];
        } catch (error) {
            console.error("Error fetching room IDs:", error);
            return [];
        }
    }
}
