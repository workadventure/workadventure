import { writable } from "svelte/store";
import { describe, expect, it } from "vitest";
import type { ChatRoom, RoomFolder } from "../Connection/ChatConnection";
import { collectFolderRooms } from "./unreadFolderRooms";

/** A folder whose rooms only exist once it has been opened, like a Matrix space. */
function fakeFolder(childRooms: string[], unread: { count: number; muted: boolean }, subFolders: RoomFolder[] = []) {
    const rooms = writable<ChatRoom[]>([]);
    const folder = {
        rooms,
        invitations: writable<ChatRoom[]>([]),
        folders: writable(subFolders),
        loaded: false,
        ensureChildrenLoaded() {
            folder.loaded = true;
            rooms.set(childRooms.map((id) => ({ id }) as ChatRoom));
        },
        getUnreadSummary: () => unread,
    };
    return folder;
}

const ids = (rooms: ChatRoom[]) => rooms.map((room) => room.id);

describe("collectFolderRooms", () => {
    it("loads a never-opened folder holding unread messages, so its rooms can be listed", () => {
        const folder = fakeFolder(["general", "design"], { count: 3, muted: false });

        expect(ids(collectFolderRooms([folder as unknown as RoomFolder]))).toEqual(["general", "design"]);
        expect(folder.loaded).toBe(true);
    });

    it("leaves folders without unread messages, or with only muted ones, unloaded", () => {
        const quiet = fakeFolder(["general"], { count: 0, muted: true });
        const muted = fakeFolder(["random"], { count: 4, muted: true });

        expect(collectFolderRooms([quiet, muted] as unknown as RoomFolder[])).toEqual([]);
        expect(quiet.loaded).toBe(false);
        expect(muted.loaded).toBe(false);
    });

    it("goes down into sub-folders", () => {
        const sub = fakeFolder(["nested"], { count: 1, muted: false });
        const parent = fakeFolder([], { count: 1, muted: false }, [sub as unknown as RoomFolder]);

        expect(ids(collectFolderRooms([parent as unknown as RoomFolder]))).toEqual(["nested"]);
    });
});
