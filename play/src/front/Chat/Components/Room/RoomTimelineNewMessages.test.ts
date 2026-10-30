import { describe, expect, it } from "vitest";
import type { ChatMessage, ChatTimelineItem } from "../../Connection/ChatConnection";
import { countIncomingMessagesAfter, findFirstUnreadKey, isReadMarkerLoaded } from "./RoomTimelineNewMessages";

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

function messageAt(id: string, senderChatId: string, minute: number) {
    const item = message(id, senderChatId);
    return { ...item, timelineItem: { ...item.timelineItem, date: new Date(Date.UTC(2026, 9, 27, 9, minute)) } };
}

describe("findFirstUnreadKey", () => {
    const readAt = (minute: number) => Date.UTC(2026, 9, 27, 9, minute);

    it("places the line on the first message from others after the marker event", () => {
        const items = [
            message("a", "@bob"),
            message("b", "@me"),
            separator,
            message("c", "@bob"),
            message("d", "@bob"),
        ];
        expect(findFirstUnreadKey(items, { eventId: "a" }, "@me")).toBe("message-c");
    });

    it("returns undefined when only my own messages follow the marker", () => {
        const items = [message("a", "@bob"), message("b", "@me")];
        expect(findFirstUnreadKey(items, { eventId: "a" }, "@me")).toBeUndefined();
    });

    it("falls back on the read time when the marker event is not displayed", () => {
        const items = [messageAt("a", "@bob", 1), messageAt("b", "@bob", 5), messageAt("c", "@bob", 9)];
        expect(findFirstUnreadKey(items, { eventId: "$reaction", timestamp: readAt(6) }, "@me")).toBe("message-c");
    });

    it("waits for older pages instead of marking the first loaded message", () => {
        const items = [messageAt("b", "@bob", 5), messageAt("c", "@bob", 9)];
        const marker = { eventId: "$reaction", timestamp: readAt(2) };
        expect(isReadMarkerLoaded(items, marker)).toBe(false);
        expect(findFirstUnreadKey(items, marker, "@me")).toBeUndefined();
        expect(findFirstUnreadKey(items, { eventId: "$reaction" }, "@me")).toBeUndefined();
    });

    it("sees the marker as loaded once its event or an older message is in the list", () => {
        expect(isReadMarkerLoaded([message("a", "@bob")], { eventId: "a" })).toBe(true);
        expect(isReadMarkerLoaded([messageAt("a", "@bob", 1)], { eventId: "$x", timestamp: readAt(2) })).toBe(true);
    });
});
