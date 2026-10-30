import { ChatPermissionLevel } from "../../Connection/ChatConnection";
import type { ChatRoomPermissionKey, ChatRoomPermissionsState } from "../../Connection/ChatConnection";

/** "Who can write": everyone, moderators only (an announcement room), or a mix set in the detailed list. */
export type WritePreset = "everyone" | "moderators" | "custom";

const RANK: Record<ChatPermissionLevel, number> = {
    [ChatPermissionLevel.USER]: 0,
    [ChatPermissionLevel.MODERATOR]: 1,
    [ChatPermissionLevel.ADMIN]: 2,
};

export function writePresetOf(permissions: ChatRoomPermissionsState): WritePreset {
    const { sendMessages, sendReactions } = permissions;
    if (sendMessages === ChatPermissionLevel.USER && sendReactions === ChatPermissionLevel.USER) return "everyone";
    if (sendMessages === ChatPermissionLevel.MODERATOR && sendReactions === ChatPermissionLevel.MODERATOR) {
        return "moderators";
    }
    return "custom";
}

/** "custom" leaves the permissions as they are: it only opens the detailed list. */
export function applyWritePreset(permissions: ChatRoomPermissionsState, preset: WritePreset): ChatRoomPermissionsState {
    if (preset === "custom") return permissions;
    const level = preset === "everyone" ? ChatPermissionLevel.USER : ChatPermissionLevel.MODERATOR;
    return { ...permissions, sendMessages: level, sendReactions: level };
}

/** The permissions the current user has today and would no longer have once `after` is saved. */
export function permissionsLostBy(
    myLevel: ChatPermissionLevel | undefined,
    before: ChatRoomPermissionsState,
    after: ChatRoomPermissionsState,
): ChatRoomPermissionKey[] {
    if (myLevel === undefined) return [];
    const mine = RANK[myLevel];
    return (Object.keys(after) as ChatRoomPermissionKey[]).filter(
        (key) => RANK[before[key]] <= mine && RANK[after[key]] > mine,
    );
}
