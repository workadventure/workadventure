import { beforeEach, describe, expect, it } from "vitest";
import { get, readable } from "svelte/store";
import type { ChatRoom, ChatThread } from "../Connection/ChatConnection";
import { selectedRoomStore } from "./SelectRoomStore";
import { selectedThreadStore } from "./SelectedThreadStore";

describe("SelectedThreadStore", () => {
    beforeEach(() => {
        selectedThreadStore.clear();
        selectedRoomStore.set(undefined);
    });

    it("keeps the selected room and clears the selected thread when the room changes", () => {
        const roomA = createRoom("!room-a:server");
        const roomB = createRoom("!room-b:server");
        const threadA = createThread("$thread-a", roomA);

        selectedRoomStore.set(roomA);
        selectedThreadStore.set(threadA);

        expect(get(selectedRoomStore)).toBe(roomA);
        expect(get(selectedThreadStore)).toBe(threadA);

        selectedRoomStore.set(roomB);

        expect(get(selectedRoomStore)).toBe(roomB);
        expect(get(selectedThreadStore)).toBeUndefined();
    });

    it("ignores threads that do not belong to the currently selected room", () => {
        const roomA = createRoom("!room-a:server");
        const roomB = createRoom("!room-b:server");
        const threadB = createThread("$thread-b", roomB);

        selectedRoomStore.set(roomA);
        selectedThreadStore.set(threadB);

        expect(get(selectedThreadStore)).toBeUndefined();
    });
});

function createRoom(id: string) {
    return {
        id,
        conversationKind: "room" as const,
        isEncrypted: readable(false),
    } as unknown as ChatRoom;
}

function createThread(id: string, parentRoom: ChatRoom) {
    return {
        id,
        conversationKind: "thread" as const,
        parentRoom,
    } as unknown as ChatThread;
}
