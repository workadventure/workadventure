import { getContext, setContext } from "svelte";
import { writable, type Writable } from "svelte/store";
import type { ChatMessage, ChatThread } from "./Connection/ChatConnection";
import { selectedChatMessageToEdit, selectedChatMessageToReply } from "./Stores/ChatStore";
import { roomTimelineFocusStore, type RoomTimelineFocusRequest } from "./Stores/RoomSidePanelStore";

const key = Symbol("chat-interaction");

export type ChatInteraction = {
    compact: boolean;
    reply: Writable<ChatMessage | null>;
    edit: Writable<ChatMessage | null>;
    timelineFocus: Writable<RoomTimelineFocusRequest | undefined>;
    openImage?: (url: string, alt?: string) => void;
    openThread?: (thread: ChatThread) => void;
};

export function createCompactChatInteraction(openThread: (thread: ChatThread) => void): ChatInteraction {
    return {
        compact: true,
        reply: writable(null),
        edit: writable(null),
        timelineFocus: writable(undefined),
        openThread,
    };
}

export function provideChatInteraction(interaction: ChatInteraction): void {
    setContext(key, interaction);
}

export function getChatInteraction(): ChatInteraction {
    return (
        getContext<ChatInteraction | undefined>(key) ?? {
            compact: false,
            reply: selectedChatMessageToReply,
            edit: selectedChatMessageToEdit,
            timelineFocus: roomTimelineFocusStore,
        }
    );
}
