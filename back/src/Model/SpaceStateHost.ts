import type { SpaceUser } from "@workadventure/messages";
import type { Space } from "./Space";

/**
 * What a space-state manager (RaiseHandManager, ProximityPollManager, ProximityQAManager) sees of its Space:
 * enough to read and change the state, and to react to users leaving -- nothing that would let it grow back into
 * the Space class.
 */
export type SpaceStateHost = Pick<Space, "filterType" | "userRemoved$" | "getUser" | "getState" | "updateState">;

/** The identity polls and questions are attributed to: the user's uuid, or their spaceUserId when they have none. */
export function voterIdOf(user: SpaceUser): string {
    return user.uuid || user.spaceUserId;
}

export function isAdmin(user: SpaceUser): boolean {
    return user.tags.includes("admin");
}
