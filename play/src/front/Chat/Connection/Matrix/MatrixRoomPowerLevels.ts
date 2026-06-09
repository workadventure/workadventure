import { EventType } from "matrix-js-sdk";
import type { RoomPowerLevelsEventContent } from "matrix-js-sdk/lib/@types/state_events";
import { ChatPermissionLevel, type ChatRoomPermissionsState } from "../ChatConnection";
import { MatrixChatRoomMember } from "./MatrixChatRoomMember";

const DEFAULT_EVENT_POWER_LEVEL = 0;
const DEFAULT_STATE_POWER_LEVEL = 50;
const DEFAULT_MODERATION_POWER_LEVEL = 50;

export function getChatPermissionLevelForPowerLevel(powerLevel: number): ChatPermissionLevel {
    if (powerLevel <= MatrixChatRoomMember.getPowerLevel(ChatPermissionLevel.USER)) {
        return ChatPermissionLevel.USER;
    }
    if (powerLevel <= MatrixChatRoomMember.getPowerLevel(ChatPermissionLevel.MODERATOR)) {
        return ChatPermissionLevel.MODERATOR;
    }
    return ChatPermissionLevel.ADMIN;
}

export function getRoomPermissionsState(powerLevels: RoomPowerLevelsEventContent = {}): ChatRoomPermissionsState {
    const events = powerLevels.events ?? {};
    const eventsDefault = powerLevels.events_default ?? DEFAULT_EVENT_POWER_LEVEL;
    const stateDefault = powerLevels.state_default ?? DEFAULT_STATE_POWER_LEVEL;

    return {
        sendMessages: getChatPermissionLevelForPowerLevel(events[EventType.RoomMessage] ?? eventsDefault),
        sendReactions: getChatPermissionLevelForPowerLevel(events[EventType.Reaction] ?? eventsDefault),
        redactOwnMessages: getChatPermissionLevelForPowerLevel(events[EventType.RoomRedaction] ?? eventsDefault),
        redactOtherMessages: getChatPermissionLevelForPowerLevel(powerLevels.redact ?? DEFAULT_MODERATION_POWER_LEVEL),
        kickUsers: getChatPermissionLevelForPowerLevel(powerLevels.kick ?? DEFAULT_MODERATION_POWER_LEVEL),
        banUsers: getChatPermissionLevelForPowerLevel(powerLevels.ban ?? DEFAULT_MODERATION_POWER_LEVEL),
        inviteUsers: getChatPermissionLevelForPowerLevel(powerLevels.invite ?? DEFAULT_MODERATION_POWER_LEVEL),
        changeSettings: getChatPermissionLevelForPowerLevel(stateDefault),
        changeRoomName: getChatPermissionLevelForPowerLevel(events[EventType.RoomName] ?? stateDefault),
        changeRoomTopic: getChatPermissionLevelForPowerLevel(events[EventType.RoomTopic] ?? stateDefault),
        changeHistoryVisibility: getChatPermissionLevelForPowerLevel(
            events[EventType.RoomHistoryVisibility] ?? stateDefault,
        ),
        changeAccess: getChatPermissionLevelForPowerLevel(events[EventType.RoomJoinRules] ?? stateDefault),
        changePermissions: getChatPermissionLevelForPowerLevel(events[EventType.RoomPowerLevels] ?? stateDefault),
    };
}

export function buildRoomPowerLevelsContent(
    currentPowerLevels: RoomPowerLevelsEventContent,
    permissions: ChatRoomPermissionsState,
): RoomPowerLevelsEventContent {
    return {
        ...currentPowerLevels,
        events_default: currentPowerLevels.events_default ?? DEFAULT_EVENT_POWER_LEVEL,
        state_default: MatrixChatRoomMember.getPowerLevel(permissions.changeSettings),
        invite: MatrixChatRoomMember.getPowerLevel(permissions.inviteUsers),
        kick: MatrixChatRoomMember.getPowerLevel(permissions.kickUsers),
        ban: MatrixChatRoomMember.getPowerLevel(permissions.banUsers),
        redact: MatrixChatRoomMember.getPowerLevel(permissions.redactOtherMessages),
        events: {
            ...currentPowerLevels.events,
            [EventType.RoomMessage]: MatrixChatRoomMember.getPowerLevel(permissions.sendMessages),
            [EventType.Reaction]: MatrixChatRoomMember.getPowerLevel(permissions.sendReactions),
            [EventType.RoomRedaction]: MatrixChatRoomMember.getPowerLevel(permissions.redactOwnMessages),
            [EventType.RoomName]: MatrixChatRoomMember.getPowerLevel(permissions.changeRoomName),
            [EventType.RoomTopic]: MatrixChatRoomMember.getPowerLevel(permissions.changeRoomTopic),
            [EventType.RoomHistoryVisibility]: MatrixChatRoomMember.getPowerLevel(permissions.changeHistoryVisibility),
            [EventType.RoomJoinRules]: MatrixChatRoomMember.getPowerLevel(permissions.changeAccess),
            [EventType.RoomPowerLevels]: MatrixChatRoomMember.getPowerLevel(permissions.changePermissions),
        },
    };
}
