import { describe, expect, it } from "vitest";
import { getAutoScrollTargetForMessageBodyUpdate, getAutoScrollTargetForTimelineUpdate } from "./RoomTimelineScroll";

describe("RoomTimelineScroll", () => {
    it("keeps the initial timeline load pinned to the bottom", () => {
        expect(
            getAutoScrollTargetForTimelineUpdate(undefined, {
                id: "received-message",
                kind: "message",
                isMyMessage: false,
            }),
        ).toEqual({ kind: "bottom" });
    });

    it("aligns new received messages to the start of the message", () => {
        expect(
            getAutoScrollTargetForTimelineUpdate("previous-message", {
                id: "received-message",
                kind: "message",
                isMyMessage: false,
            }),
        ).toEqual({ kind: "item-start", eventId: "received-message" });
    });

    it("keeps new sent messages pinned to the bottom", () => {
        expect(
            getAutoScrollTargetForTimelineUpdate("previous-message", {
                id: "sent-message",
                kind: "message",
                isMyMessage: true,
            }),
        ).toEqual({ kind: "bottom" });
    });

    it("keeps received message body updates aligned to the start of the message", () => {
        expect(
            getAutoScrollTargetForMessageBodyUpdate(
                {
                    id: "received-message",
                    kind: "message",
                    isMyMessage: false,
                },
                "received-message",
            ),
        ).toEqual({ kind: "item-start", eventId: "received-message" });
    });
});
