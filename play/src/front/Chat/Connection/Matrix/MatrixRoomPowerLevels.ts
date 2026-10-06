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

/**
 * The settings UI only exposes the three coarse roles (USER / MODERATOR / ADMIN), but a room may
 * use arbitrary numeric power levels (e.g. a `ban` requirement of 75). Naively writing back the
 * canonical level for the selected role would silently coerce every custom level (75 -> 100) as
 * soon as the moderator touches an unrelated permission. To avoid that, we only rewrite a level
 * when the role it maps to actually changed; otherwise we keep the original numeric value.
 */
function resolvePowerLevel(currentLevel: number, desiredRole: ChatPermissionLevel): number {
    if (getChatPermissionLevelForPowerLevel(currentLevel) === desiredRole) {
        return currentLevel;
    }
    return MatrixChatRoomMember.getPowerLevel(desiredRole);
}

export function buildRoomPowerLevelsContent(
    currentPowerLevels: RoomPowerLevelsEventContent,
    permissions: ChatRoomPermissionsState,
): RoomPowerLevelsEventContent {
    const currentEvents = currentPowerLevels.events ?? {};
    const eventsDefault = currentPowerLevels.events_default ?? DEFAULT_EVENT_POWER_LEVEL;
    const stateDefault = currentPowerLevels.state_default ?? DEFAULT_STATE_POWER_LEVEL;

    // Fallback chains mirror getRoomPermissionsState so the role we compare against is exactly the
    // one the UI displayed for the current room state.
    const resolveEvent = (eventType: EventType, fallback: number, desiredRole: ChatPermissionLevel): number =>
        resolvePowerLevel(currentEvents[eventType] ?? fallback, desiredRole);

    return {
        ...currentPowerLevels,
        events_default: eventsDefault,
        state_default: resolvePowerLevel(stateDefault, permissions.changeSettings),
        invite: resolvePowerLevel(currentPowerLevels.invite ?? DEFAULT_MODERATION_POWER_LEVEL, permissions.inviteUsers),
        kick: resolvePowerLevel(currentPowerLevels.kick ?? DEFAULT_MODERATION_POWER_LEVEL, permissions.kickUsers),
        ban: resolvePowerLevel(currentPowerLevels.ban ?? DEFAULT_MODERATION_POWER_LEVEL, permissions.banUsers),
        redact: resolvePowerLevel(
            currentPowerLevels.redact ?? DEFAULT_MODERATION_POWER_LEVEL,
            permissions.redactOtherMessages,
        ),
        events: {
            ...currentEvents,
            [EventType.RoomMessage]: resolveEvent(EventType.RoomMessage, eventsDefault, permissions.sendMessages),
            [EventType.Reaction]: resolveEvent(EventType.Reaction, eventsDefault, permissions.sendReactions),
            [EventType.RoomRedaction]: resolveEvent(
                EventType.RoomRedaction,
                eventsDefault,
                permissions.redactOwnMessages,
            ),
            [EventType.RoomName]: resolveEvent(EventType.RoomName, stateDefault, permissions.changeRoomName),
            [EventType.RoomTopic]: resolveEvent(EventType.RoomTopic, stateDefault, permissions.changeRoomTopic),
            [EventType.RoomHistoryVisibility]: resolveEvent(
                EventType.RoomHistoryVisibility,
                stateDefault,
                permissions.changeHistoryVisibility,
            ),
            [EventType.RoomJoinRules]: resolveEvent(EventType.RoomJoinRules, stateDefault, permissions.changeAccess),
            [EventType.RoomPowerLevels]: resolveEvent(
                EventType.RoomPowerLevels,
                stateDefault,
                permissions.changePermissions,
            ),
        },
    };
}
