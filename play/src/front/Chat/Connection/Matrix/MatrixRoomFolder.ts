import { Room } from "matrix-js-sdk";
import { get, Readable, Writable, writable } from "svelte/store";
import { KnownMembership } from "matrix-js-sdk/lib/types";
import * as Sentry from "@sentry/svelte";
import { RoomFolder } from "../ChatConnection";
import { MatrixChatRoom } from "./MatrixChatRoom";

export class MatrixRoomFolder implements RoomFolder {
    rooms: Writable<MatrixChatRoom[]> = writable([]);
    folders: Writable<MatrixRoomFolder[]> = writable([]);
    id: string;
    name: Readable<string>;
    loadRoomsAndFolderPromise: Promise<void>;

    constructor(private room: Room) {
        this.name = writable(room.name);
        this.id = room.roomId;

        const defaultFoldersAndRooms: {
            folders: MatrixRoomFolder[];
            rooms: MatrixChatRoom[];
        } = {
            folders: [] as MatrixRoomFolder[],
            rooms: [] as MatrixChatRoom[],
        };

        this.loadRoomsAndFolderPromise = new Promise((resolve, reject) => {
            this.room.client
                .getRoomHierarchy(room.roomId, 100, 1)
                .then(({ rooms: roomsHierarchy }) => {
                    const { folders, rooms } =
                        roomsHierarchy.reduce((acc, cur) => {
                            const childRoom = room.client.getRoom(cur.room_id);
                            if (!childRoom || cur.room_id === this.id) return acc;

                            if (childRoom.isSpaceRoom()) {
                                acc.folders.push(new MatrixRoomFolder(childRoom));
                            } else {
                                const matrixChatRoom = new MatrixChatRoom(childRoom);
                                if (matrixChatRoom.myMembership === KnownMembership.Join) {
                                    acc.rooms.push(new MatrixChatRoom(childRoom));
                                }
                            }

                            return acc;
                        }, defaultFoldersAndRooms) || defaultFoldersAndRooms;

                    this.rooms.update((oldRooms) => {
                        return [...oldRooms, ...rooms];
                    });
                    this.folders.update((oldfolders) => {
                        return [...oldfolders, ...folders];
                    });
                    console.log("finish to load folders and room in :", get(this.name));
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
        const roomsList = get(this.rooms);
        const roomNode = roomsList.find((room) => room.id === id);
        if (roomNode) {
            return roomNode;
        }
        const folderList = get(this.folders);
        const folderNode = folderList.find((room) => room.id === id);

        if (folderNode) {
            return folderNode;
        }

        for (const folder of get(this.folders)) {
            const node = folder.getNode(id);
            if (node) {
                return node;
            }
        }

        return undefined;
    }

    deleteNode(id: string): boolean {
        const hasNodeInRoom = get(this.rooms).some((room) => room.id === id);
        if (hasNodeInRoom) {
            this.rooms.update((rooms) => {
                console.log("delete a sub room");
                return rooms.filter((room) => room.id !== id);
            });
            return true;
        }

        const hasNodeInFolder = get(this.folders).some((folder) => folder.id === id);
        if (hasNodeInFolder) {
            this.folders.update((folders) => {
                console.log("delete a sub folder");
                return folders.filter((folder) => folder.id !== id);
            });
            return true;
        }

        for (const folder of get(this.folders)) {
            if (folder.deleteNode(id)) {
                return true;
            }
        }

        return false;
    }

    getParentOfNode(id: string): MatrixRoomFolder | undefined {
        const roomsList = get(this.rooms);
        const roomNode = roomsList.find((room) => room.id === id);
        if (roomNode) {
            return this;
        }
        const folderList = get(this.folders);
        const folderNode = folderList.find((room) => room.id === id);

        if (folderNode) {
            return this;
        }

        for (const folder of get(this.folders)) {
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

            const roomlist = get(this.rooms);
            const roomIDs = roomlist.map((room) => room.id);

            const folders = get(this.folders);

            const nestedRoomIDs = await Promise.all(folders.map((folder) => folder.getRoomsIdInNode()));

            return [...roomIDs, ...nestedRoomIDs.flat()];
        } catch (error) {
            console.error("Error fetching room IDs:", error);

            return [];
        }
    }
}
