import { type Readable, derived } from "svelte/store";
import { raisedHandSectionsStore } from "./PeerStore";

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
 * Readable map: space name → (spaceUserId → 1-based position in that space's raise-hand queue, ordered by the
 * moment the hand was raised, server-stamped). A participant is absent when their hand is not raised there.
 *
 * Each space keeps its own numbering: a bubble's queue does not count the hands raised for a megaphone the same
 * players listen to. The queues come from the space state (see PeerStore.raisedHandSectionsStore), so they are
 * consistent for every participant — including a megaphone speaker who does not receive the listeners' SpaceUser.
 */
export const raisedHandsOrderStore: Readable<Map<string, Map<string, number>>> = derived(
    raisedHandSectionsStore,
    (sections) =>
        new Map(
            sections.map((section) => [
                section.space.getName(),
                new Map(section.hands.map((entry, index) => [entry.spaceUserId, index + 1])),
            ]),
        ),
);

/**
 * Where a user's raised hand stands in the queue of `spaceName`, the space of the video tile showing them.
 * Without a space — the local tile, whose space user is a placeholder — the first queue holding the hand is used.
 */
// ponytail: the local tile shows a single badge, so a hand raised in two spaces shows the first one's position.
export function findHandPosition(
    order: Map<string, Map<string, number>>,
    spaceName: string | undefined,
    spaceUserId: string,
): { position: number; queueSize: number } | undefined {
    const queues = spaceName !== undefined ? [order.get(spaceName)] : [...order.values()];
    for (const queue of queues) {
        const position = queue?.get(spaceUserId);
        if (queue && position !== undefined) {
            return { position, queueSize: queue.size };
        }
    }
    return undefined;
}

/**
 * Readable set of numeric player ids (derived from each raised participant's spaceUserId) whose hand is raised
 * in any space. Drives the raised-hand indicator above the woka on the map (keyed by player id): a hand raised
 * for a megaphone speaker is a public signal on the map too.
 */
export const raisedHandPlayerIdsStore: Readable<Set<number>> = derived(raisedHandSectionsStore, (sections) => {
    const playerIds = new Set<number>();
    for (const entry of sections.flatMap((section) => section.hands)) {
        const playerId = getPlayerIdFromSpaceUserId(entry.spaceUserId);
        if (playerId !== undefined) {
            playerIds.add(playerId);
        }
    }
    return playerIds;
});
