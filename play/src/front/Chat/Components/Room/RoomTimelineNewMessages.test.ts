import { describe, expect, it } from "vitest";
import type { ChatMessage, ChatTimelineItem } from "../../Connection/ChatConnection";
import { countIncomingMessagesAfter } from "./RoomTimelineNewMessages";

function message(id: string, senderChatId: string) {
    const timelineItem = {
        kind: "message",
        id,
        date: null,
        message: { sender: { chatId: senderChatId } } as ChatMessage,
    } satisfies ChatTimelineItem;
    return { key: `message-${id}`, timelineItem };
}

function system(id: string) {
    const timelineItem = { kind: "system", id, date: null, message: {} as ChatMessage } satisfies ChatTimelineItem;
    return { key: `system-${id}`, timelineItem };
}

const separator = { key: "sep-2026-10-27" };

describe("countIncomingMessagesAfter", () => {
    it("counts messages from others after the previous last item", () => {
        const items = [message("a", "@bob"), message("b", "@alice"), separator, message("c", "@bob")];
        expect(countIncomingMessagesAfter(items, "message-a", "@me")).toBe(2);
    });

    it("ignores my own messages, system events and day separators", () => {
        const items = [message("a", "@bob"), separator, system("join"), message("b", "@me"), message("c", "@bob")];
        expect(countIncomingMessagesAfter(items, "message-a", "@me")).toBe(1);
    });

    it("returns 0 when nothing came after the previous last item", () => {
        expect(countIncomingMessagesAfter([message("a", "@bob")], "message-a", "@me")).toBe(0);
    });

    it("returns 0 when the previous last item is gone (timeline rebuilt)", () => {
        const items = [message("x", "@bob"), message("y", "@bob")];
        expect(countIncomingMessagesAfter(items, "message-a", "@me")).toBe(0);
        expect(countIncomingMessagesAfter(items, undefined, "@me")).toBe(0);
    });

    it("counts everything from others when my chat id is unknown", () => {
        const items = [message("a", "@bob"), message("b", "@me")];
        expect(countIncomingMessagesAfter(items, "message-a", null)).toBe(1);
    });
});
