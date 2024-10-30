import { ClientEvent, Room, SyncState } from "matrix-js-sdk";
import { Writable, writable } from "svelte/store";
import { KnownMembership } from "matrix-js-sdk/lib/types";
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
    public readonly loadRoomsAndFolderPromise: Promise<void>;

    constructor(private room: Room) {
        this.name = writable(room.name);
        this.id = room.roomId;

        this.loadRoomsAndFolderPromise = new Promise((resolve, reject) => {
            if (room.name === "Exchange") {
                console.trace(">>>>roomsHierarchy", room.getMyMembership());
            }

            this.room.client
                .getRoomHierarchy(room.roomId, 100, 1)
                .then(({ rooms: roomsHierarchy }) => {
                    if (room.name === "Exchange") {
                        console.log(">>>>roomsHierarchy", roomsHierarchy);
                    }
                    const roomsPromise: Promise<void>[] = [];
                    roomsHierarchy.forEach((cur) => {
                        const childRoom = room.client.getRoom(cur.room_id);

                        if (!childRoom || cur.room_id === this.id) return;

                        if (KnownMembership.Invite === childRoom.getMyMembership()) {
                            if (childRoom.name === "Exchange") {
                                console.log(">>>>roomsHierarch skip child room exchange", childRoom.getMyMembership());
                            }
                            return; // skip the room if it is not joined
                        }

                        if (childRoom.name === "Exchange") {
                            console.log(">>>>roomsHierarch join child room exchange", childRoom.getMyMembership());
                        }

                        if (childRoom.isSpaceRoom() && childRoom.getMyMembership() === KnownMembership.Join) {
                            const newfolder = new MatrixRoomFolder(childRoom);
                            this.folders.set(childRoom.roomId, newfolder);
                            roomsPromise.push(newfolder.loadRoomsAndFolderPromise);
                        } else {
                            const matrixChatRoom = new MatrixChatRoom(childRoom);
                            if (matrixChatRoom.myMembership === KnownMembership.Join) {
                                this.rooms.set(childRoom.roomId, matrixChatRoom);
                            }
                        }
                    });
                    Promise.all(roomsPromise).finally(() => resolve());
                    //resolve();
                })
                .catch((error) => {
                    if (room.name === "Exchange") {
                        console.log(">>>>Failed to get folder Hierarchy roomsHierarchy  : exchange");
                    }
                    console.error("Failed to get folder Hierarchy roomsHierarchy :" + error);
                    Sentry.captureMessage("Failed to get folder Hierarchy");
                    reject(new Error("Failed to get folder Hierarchy"));
                });
        });
    }

    async getNode(id: string): Promise<MatrixRoomFolder | MatrixChatRoom | undefined> {
        try {
            await this.loadRoomsAndFolderPromise;
        } catch (e) {
            console.error("...");
            Sentry.captureMessage(`.... : ${e}`);
            return undefined;
        }

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
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
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

    private async waitForNextSync() {
        await new Promise<void>((resolve, reject) => {
            const resolveIfIsASyncingEvent = (state: SyncState) => {
                if (state === SyncState.Syncing) {
                    if (timer) clearTimeout(timer);
                    this.room.client.off(ClientEvent.Sync, resolveIfIsASyncingEvent);
                    resolve();
                }
            };

            const timer = setTimeout(() => {
                this.room.client.off(ClientEvent.Sync, resolveIfIsASyncingEvent);
                reject(new Error("waitForSync event timeout"));
            }, 30000);

            this.room.client.on(ClientEvent.Sync, resolveIfIsASyncingEvent);
        });
    }
}
