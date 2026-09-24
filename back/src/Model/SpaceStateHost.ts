import type { Observable } from "rxjs";
import type { FilterType, SpaceUser } from "@workadventure/messages";
import type { SpaceState } from "@workadventure/shared-utils";

/**
 * What a space-state manager (RaiseHandManager, ProximityPollManager, ProximityQAManager) sees of its Space:
 * enough to read and change the state, and to react to users leaving -- nothing that would let it grow back into
 * the Space class.
 */
export interface SpaceStateHost {
    readonly filterType: FilterType;
    readonly userRemoved$: Observable<SpaceUser>;
    getUser(spaceUserId: string): SpaceUser | undefined;
    getState(): Readonly<SpaceState>;
    updateState(mutate: (state: SpaceState) => void): void;
}

/** The identity polls and questions are attributed to: the user's uuid, or their spaceUserId when they have none. */
export function voterIdOf(user: SpaceUser): string {
    return user.uuid || user.spaceUserId;
}

export function isAdmin(user: SpaceUser): boolean {
    return user.tags.includes("admin");
}
