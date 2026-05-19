import { EventType } from "matrix-js-sdk";
import { describe, expect, it } from "vitest";
import type { RoomPowerLevelsEventContent } from "matrix-js-sdk/lib/@types/state_events";
import { ChatPermissionLevel, type ChatRoomPermissionsState } from "../../ChatConnection";
import { buildRoomPowerLevelsContent, getRoomPermissionsState } from "../MatrixRoomPowerLevels";

describe("MatrixRoomPowerLevels", () => {
    it("maps custom Matrix levels to the next WorkAdventure permission role", () => {
        const powerLevels: RoomPowerLevelsEventContent = {
            events_default: 0,
            state_default: 30,
            events: {
                [EventType.RoomName]: 30,
                [EventType.RoomTopic]: 75,
                [EventType.RoomHistoryVisibility]: 100,
                [EventType.RoomJoinRules]: 50,
                [EventType.RoomPowerLevels]: 100,
                [EventType.RoomMessage]: 0,
                [EventType.Reaction]: 50,
                [EventType.RoomRedaction]: 0,
            },
            invite: 0,
            kick: 50,
            ban: 75,
            redact: 50,
        };

        expect(getRoomPermissionsState(powerLevels)).toEqual({
            sendMessages: ChatPermissionLevel.USER,
            sendReactions: ChatPermissionLevel.MODERATOR,
            redactOwnMessages: ChatPermissionLevel.USER,
            redactOtherMessages: ChatPermissionLevel.MODERATOR,
            kickUsers: ChatPermissionLevel.MODERATOR,
            banUsers: ChatPermissionLevel.ADMIN,
            inviteUsers: ChatPermissionLevel.USER,
            changeSettings: ChatPermissionLevel.MODERATOR,
            changeRoomName: ChatPermissionLevel.MODERATOR,
            changeRoomTopic: ChatPermissionLevel.ADMIN,
            changeHistoryVisibility: ChatPermissionLevel.ADMIN,
            changeAccess: ChatPermissionLevel.MODERATOR,
            changePermissions: ChatPermissionLevel.ADMIN,
        });
    });

    it("builds a Matrix power levels update without dropping unrelated content", () => {
        const currentPowerLevels: RoomPowerLevelsEventContent = {
            users_default: 0,
            notifications: { room: 50 },
            events: {
                [EventType.RoomAvatar]: 50,
            },
        };
        const permissions: ChatRoomPermissionsState = {
            sendMessages: ChatPermissionLevel.USER,
            sendReactions: ChatPermissionLevel.USER,
            redactOwnMessages: ChatPermissionLevel.USER,
            redactOtherMessages: ChatPermissionLevel.ADMIN,
            kickUsers: ChatPermissionLevel.MODERATOR,
            banUsers: ChatPermissionLevel.ADMIN,
            inviteUsers: ChatPermissionLevel.USER,
            changeSettings: ChatPermissionLevel.MODERATOR,
            changeRoomName: ChatPermissionLevel.MODERATOR,
            changeRoomTopic: ChatPermissionLevel.ADMIN,
            changeHistoryVisibility: ChatPermissionLevel.ADMIN,
            changeAccess: ChatPermissionLevel.MODERATOR,
            changePermissions: ChatPermissionLevel.ADMIN,
        };

        expect(buildRoomPowerLevelsContent(currentPowerLevels, permissions)).toEqual({
            users_default: 0,
            notifications: { room: 50 },
            events_default: 0,
            state_default: 50,
            invite: 0,
            kick: 50,
            ban: 100,
            redact: 100,
            events: {
                [EventType.RoomAvatar]: 50,
                [EventType.RoomMessage]: 0,
                [EventType.Reaction]: 0,
                [EventType.RoomRedaction]: 0,
                [EventType.RoomName]: 50,
                [EventType.RoomTopic]: 100,
                [EventType.RoomHistoryVisibility]: 100,
                [EventType.RoomJoinRules]: 50,
                [EventType.RoomPowerLevels]: 100,
            },
        });
    });
});
