import { describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { mock } from "vitest-mock-extended";
import type { ChatMessage, ChatThread } from "./Connection/ChatConnection";
vi.mock("./Stores/ChatStore", async () => {
    const { writable } = await import("svelte/store");
    return { selectedChatMessageToReply: writable(null), selectedChatMessageToEdit: writable(null) };
});
vi.mock("./Stores/RoomSidePanelStore", async () => {
    const { writable } = await import("svelte/store");
    return { roomTimelineFocusStore: writable(undefined) };
});
import { createCompactChatInteraction } from "./ChatInteractionContext";
import { selectedChatMessageToReply, selectedChatMessageToEdit } from "./Stores/ChatStore";

describe("independent compact chat interactions", () => {
    it("does not change the main chat's reply or edit when interacting in a companion", () => {
        const main = mock<ChatMessage>();
        const other = mock<ChatMessage>();
        selectedChatMessageToReply.set(main);
        selectedChatMessageToEdit.set(main);
        const compact = createCompactChatInteraction(vi.fn());
        compact.reply.set(other);
        compact.edit.set(other);
        expect(get(selectedChatMessageToReply)).toBe(main);
        expect(get(selectedChatMessageToEdit)).toBe(main);
        compact.reply.set(null);
        compact.edit.set(null);
        expect(get(selectedChatMessageToReply)).toBe(main);
    });
    it("opens threads inside the compact surface and keeps each surface independent", () => {
        const open = vi.fn();
        const first = createCompactChatInteraction(open);
        const second = createCompactChatInteraction(vi.fn());
        const thread = mock<ChatThread>();
        first.openThread?.(thread);
        expect(open).toHaveBeenCalledWith(thread);
        first.reply.set(mock<ChatMessage>());
        expect(get(second.reply)).toBeNull();
    });
});
