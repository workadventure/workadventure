import { describe, expect, it, vi } from "vitest";
import { readable } from "svelte/store";
import { MapStore, SearchableArrayStore } from "@workadventure/store-utils";
import type {
    ChatMessage,
    ChatMessageType,
    ChatTimelineItem,
} from "../../../../src/front/Chat/Connection/ChatConnection";
import { createProximityTimelineItemsStore } from "../../../../src/front/Chat/Connection/Proximity/ProximityTimelineItemsStore";

describe("createProximityTimelineItemsStore", () => {
    it("treats SearchableArrayStore as a single source store", () => {
        const messages = new SearchableArrayStore<string, ChatMessage>((item) => item.id);
        const timelineItemsStore = createProximityTimelineItemsStore(messages);
        let latestTimelineItems: readonly ChatTimelineItem[] = [];

        const unsubscribe = timelineItemsStore.subscribe((timelineItems) => {
            latestTimelineItems = timelineItems;
        });

        messages.push(createMessage("incoming-event", "incoming"), createMessage("text-event", "text"));

        expect(latestTimelineItems).toHaveLength(2);
        expect(Array.isArray(latestTimelineItems)).toBe(true);
        expect(latestTimelineItems).not.toBeInstanceOf(SearchableArrayStore);
        expect(latestTimelineItems).toMatchObject([
            { kind: "system", id: "incoming-event" },
            { kind: "message", id: "text-event" },
        ]);

        unsubscribe();
    });
});

function createMessage(id: string, type: ChatMessageType): ChatMessage {
    return {
        id,
        sender: undefined,
        content: readable({ body: id, url: undefined }),
        isMyMessage: false,
        isQuotedMessage: false,
        date: new Date("2026-04-22T10:00:00.000Z"),
        quotedMessage: undefined,
        type,
        reactions: new MapStore(),
        remove: vi.fn(),
        edit: vi.fn(() => Promise.resolve()),
        isDeleted: readable(false),
        isModified: readable(false),
        addReaction: vi.fn(() => Promise.resolve()),
        canDelete: readable(false),
    };
}
