import { describe, expect, it } from "vitest";
import { ChatPermissionLevel } from "../../Connection/ChatConnection";
import type { ChatRoomPermissionsState } from "../../Connection/ChatConnection";
import { applyWritePreset, permissionsLostBy, writePresetOf } from "./roomPermissionPresets";

const { USER, MODERATOR, ADMIN } = ChatPermissionLevel;
const base: ChatRoomPermissionsState = {
    sendMessages: USER,
    sendReactions: USER,
    redactOwnMessages: USER,
    redactOtherMessages: MODERATOR,
    kickUsers: MODERATOR,
    banUsers: MODERATOR,
    inviteUsers: USER,
    changeSettings: ADMIN,
    changeRoomName: MODERATOR,
    changeRoomTopic: MODERATOR,
    changeHistoryVisibility: ADMIN,
    changeAccess: ADMIN,
    changePermissions: ADMIN,
};

describe("roomPermissionPresets", () => {
    it("reads and applies the write presets", () => {
        expect(writePresetOf(base)).toBe("everyone");
        const announcements = applyWritePreset(base, "moderators");
        expect(writePresetOf(announcements)).toBe("moderators");
        expect(announcements.kickUsers).toBe(MODERATOR);
        expect(writePresetOf({ ...base, sendReactions: MODERATOR })).toBe("custom");
        expect(applyWritePreset(announcements, "custom")).toBe(announcements);
    });

    it("lists only the rights the current user is about to lose", () => {
        const after = { ...base, changeRoomName: ADMIN, inviteUsers: MODERATOR };
        expect(permissionsLostBy(MODERATOR, base, after)).toEqual(["changeRoomName"]);
        expect(permissionsLostBy(ADMIN, base, after)).toEqual([]);
        expect(permissionsLostBy(USER, base, after)).toEqual(["inviteUsers"]);
        expect(permissionsLostBy(undefined, base, after)).toEqual([]);
    });
});
