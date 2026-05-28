import { readable } from "svelte/store";
import { describe, expect, it } from "vitest";
import { hasProximityChatSidePanel } from "./ChatConnection";

describe("hasProximityChatSidePanel", () => {
    it("should accept proximity rooms with participants, polls, and notification controls", () => {
        const room = {
            conversationKind: "room",
            pollItems: readable([]),
            currentMeetingParticipantsStore: readable([]),
            areNotificationsMuted: readable(false),
            muteNotification: () => Promise.resolve(),
            unmuteNotification: () => Promise.resolve(),
        } as const;

        expect(hasProximityChatSidePanel(room)).toBe(true);
    });

    it("should reject Matrix-like rooms without proximity participants", () => {
        const room = {
            conversationKind: "room",
            pollItems: readable([]),
            areNotificationsMuted: readable(false),
            muteNotification: () => Promise.resolve(),
            unmuteNotification: () => Promise.resolve(),
        } as const;

        expect(hasProximityChatSidePanel(room)).toBe(false);
    });
});
