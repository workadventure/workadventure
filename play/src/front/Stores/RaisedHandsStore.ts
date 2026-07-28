import { type Readable, derived } from "svelte/store";
import { raisedHandsStore, speakingUsersStore } from "./PeerStore";
import { userIsAdminStore } from "./GameStore";
import { isSpeakerStore } from "./MediaStore";

/**
 * Extracts the numeric player (zone) id encoded in a spaceUserId of the form `${roomUrl}_${userId}`.
 * Returns undefined for the local user ("local") or any id that does not match the expected format.
 * (Same encoding as ProximityChatRoom.extractUserIdAndRoomUrlFromSpaceId.)
 */
function getPlayerIdFromSpaceUserId(spaceUserId: string): number | undefined {
    const lastUnderscoreIndex = spaceUserId.lastIndexOf("_");
    if (lastUnderscoreIndex === -1) {
        return undefined;
    }
    const playerId = parseInt(spaceUserId.substring(lastUnderscoreIndex + 1), 10);
    return isNaN(playerId) ? undefined : playerId;
}

/**
 * Readable map: spaceUserId → 1-based position in the raise-hand queue (ordered by the moment the hand was
 * raised, server-stamped). A participant is absent from the map when their hand is not raised.
 *
 * The queue comes from the space metadata (see PeerStore.raisedHandsStore), so it is consistent for every
 * participant — including a megaphone speaker who does not receive the listeners' SpaceUser.
 */
export const raisedHandsOrderStore: Readable<Map<string, number>> = derived(raisedHandsStore, (queue) => {
    const positions = new Map<string, number>();
    queue.forEach((entry, index) => positions.set(entry.spaceUserId, index + 1));
    return positions;
});

/**
 * Readable set of numeric player ids (derived from each raised participant's spaceUserId) whose hand is
 * raised. Drives the raised-hand indicator above the woka on the map (keyed by player id).
 */
export const raisedHandPlayerIdsStore: Readable<Set<number>> = derived(raisedHandsStore, (queue) => {
    const playerIds = new Set<number>();
    for (const entry of queue) {
        const playerId = getPlayerIdFromSpaceUserId(entry.spaceUserId);
        if (playerId !== undefined) {
            playerIds.add(playerId);
        }
    }
    return playerIds;
});

/**
 * Whether the host-side raised-hands panel should be shown: only to a user who can act on it
 * (an admin, or a megaphone speaker) and only while there is something to act on (at least one
 * raised hand or one user currently holding the floor). This is the single source of truth for the
 * panel's auto show/hide; it used to live inline in ActionBar.svelte.
 */
export const raisedHandsAdminVisibleStore: Readable<boolean> = derived(
    [userIsAdminStore, isSpeakerStore, raisedHandsStore, speakingUsersStore],
    ([$userIsAdmin, $isSpeaker, $raisedHands, $speakers]) =>
        ($userIsAdmin || $isSpeaker) && ($raisedHands.length > 0 || $speakers.length > 0),
);
