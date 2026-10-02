import { writable } from "svelte/store";
import type { ChatConversation, ChatThread } from "../Connection/ChatConnection";

const createSelectedThreadStore = () => {
    const { subscribe, set: baseSet } = writable<ChatThread | undefined>(undefined);
    let currentThread: ChatThread | undefined;
    let currentRoomId: string | undefined;

    const set = (thread: ChatThread | undefined) => {
        if (!thread) {
            currentThread = undefined;
            baseSet(undefined);
            return;
        }

        if (!currentRoomId || currentRoomId !== thread.parentRoom.id) {
            currentThread = undefined;
            baseSet(undefined);
            return;
        }

        currentThread = thread;
        baseSet(thread);
    };

    return {
        subscribe,
        set,
        clear() {
            currentThread = undefined;
            baseSet(undefined);
        },
        syncWithRoom(selectedRoom: ChatConversation | undefined) {
            currentRoomId = selectedRoom?.conversationKind === "room" ? selectedRoom.id : undefined;

            if (!currentThread || !currentRoomId || currentThread.parentRoom.id !== currentRoomId) {
                currentThread = undefined;
                baseSet(undefined);
            }
        },
    };
};

export const selectedThreadStore = createSelectedThreadStore();
export const isThreadPanelEnabledStore = writable(false);
