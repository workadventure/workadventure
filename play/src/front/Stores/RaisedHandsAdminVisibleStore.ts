import { type Readable, derived } from "svelte/store";
import { FilterType } from "@workadventure/messages";
import type { RaisedHandSection } from "../Space/SpaceInterface";
import { raisedHandSectionsStore } from "./PeerStore";
import { userIsAdminStore } from "./GameStore";

export interface RaisedHandSectionRights {
    /** Whether the section is shown to the local user at all. */
    visible: boolean;
    /** Lowering someone else's hand ("Lower hand", "Lower all"). */
    canModerate: boolean;
    /** "Give the floor" / "Take back the floor": a real promotion to speaker, so a broadcast-only thing. */
    floorControls: boolean;
}

/**
 * What the local user may see and do in one section of the "raised hands" panel. Decided per space, never
 * globally: the same user can be a plain member of a bubble and the host of the room megaphone at once.
 *
 *  - A proximity bubble or a LiveKit meeting room (an ALL_USERS space): everyone already speaks and there is
 *    no host, so the queue is shown to every member, without floor controls; whoever leads the discussion hands
 *    the floor over orally. Lowering someone else's hand stays an admin thing there.
 *  - A megaphone broadcast (room megaphone or podium zone): the queue is a moderation tool, reserved to whoever
 *    is on air as the host (not a guest given the floor, see RaisedHandSection.onAirHere) and to admins, the
 *    same people the back lets moderate (RaiseHandManager.assertCanModerate).
 */
export function sectionRights(section: RaisedHandSection, isAdmin: boolean): RaisedHandSectionRights {
    if (section.space.filterType === FilterType.ALL_USERS) {
        return { visible: true, canModerate: isAdmin, floorControls: false };
    }
    const isHost = isAdmin || section.onAirHere;
    return { visible: isHost, canModerate: isHost, floorControls: isHost };
}

/**
 * The sections of the "raised hands" panel the local user can see, with what they may do in each. The dock only
 * shows while this is not empty: a section only exists while its space has a raised hand or a floor holder.
 *
 * It lives apart from RaisedHandsStore on purpose: that module is imported by GameScene, and this one is only
 * needed by the dock component, which is imported well after the stores are initialised.
 */
export const visibleRaisedHandSectionsStore: Readable<(RaisedHandSection & RaisedHandSectionRights)[]> = derived(
    [raisedHandSectionsStore, userIsAdminStore],
    ([$sections, $isAdmin]) =>
        $sections
            .map((section) => ({ ...section, ...sectionRights(section, $isAdmin) }))
            .filter((section) => section.visible),
);
