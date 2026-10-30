import { describe, expect, it } from "vitest";
import { planMessageNotification, type IncomingMessage } from "./MessageNotificationPolicy";

const roomMessage: IncomingMessage = {
    chatVisible: false,
    roomDisplayed: false,
    muted: false,
    mentionsMe: false,
    direct: false,
    roomBrowserNotifications: false,
};

describe("planMessageNotification", () => {
    it("signals nothing for the conversation on screen", () => {
        expect(
            planMessageNotification({ ...roomMessage, chatVisible: true, roomDisplayed: true, mentionsMe: true }),
        ).toEqual({ sound: false, toast: false, banner: false, browser: false });
    });

    it("keeps the toast and the sound while the chat is closed", () => {
        expect(planMessageNotification(roomMessage)).toEqual({
            sound: true,
            toast: true,
            banner: false,
            browser: false,
        });
    });

    it("only raises the unread count for a room message while the chat shows another conversation", () => {
        expect(planMessageNotification({ ...roomMessage, chatVisible: true })).toEqual({
            sound: false,
            toast: false,
            banner: false,
            browser: false,
        });
    });

    it.each([
        ["a mention", { mentionsMe: true }],
        ["a direct message", { direct: true }],
    ])("shows a banner with a sound for %s while the chat shows another conversation", (_, message) => {
        expect(planMessageNotification({ ...roomMessage, ...message, chatVisible: true })).toEqual({
            sound: true,
            toast: false,
            banner: true,
            browser: true,
        });
    });

    it("stays silent for a muted room, unless the message mentions the user", () => {
        expect(planMessageNotification({ ...roomMessage, muted: true, direct: true, chatVisible: true })).toEqual({
            sound: false,
            toast: false,
            banner: false,
            browser: false,
        });
        expect(
            planMessageNotification({ ...roomMessage, muted: true, mentionsMe: true, chatVisible: true }).banner,
        ).toBe(true);
    });

    it.each([
        ["a direct message", { direct: true }],
        ["a mention", { mentionsMe: true }],
        ["a room message, once the user asked for them", { roomBrowserNotifications: true }],
    ])("notifies the browser for %s", (_, message) => {
        expect(planMessageNotification({ ...roomMessage, ...message }).browser).toBe(true);
    });
});
