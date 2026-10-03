import { type Readable, derived } from "svelte/store";
import type { SpaceInterface } from "../Space/SpaceInterface";
import { raisedHandSectionsStore } from "./PeerStore";

/**
 * The player (Woka) id of a space user. The pusher sends it with the user (roomUserId). An older pusher did not, but
 * its spaceUserIds ended with it (`${roomUrl}_${userId}`). Today's end with a hash, which may start with digits: only
 * a short all-digit suffix is read. Undefined for the local user ("local") and for a user this space did not send.
 */
function getPlayerId(space: SpaceInterface, spaceUserId: string): number | undefined {
    const roomUserId = space.getSpaceUserBySpaceUserId(spaceUserId)?.roomUserId;
    if (roomUserId) {
        return roomUserId;
    }
    const legacyUserId = /_(\d{1,9})$/.exec(spaceUserId)?.[1];
    return legacyUserId === undefined ? undefined : Number(legacyUserId);
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
 * Readable set of numeric player ids whose hand is raised in any space. Drives the raised-hand indicator above the
 * woka on the map (keyed by player id): a hand raised for a megaphone speaker is a public signal on the map too.
 */
export const raisedHandPlayerIdsStore: Readable<Set<number>> = derived(raisedHandSectionsStore, (sections) => {
    const playerIds = new Set<number>();
    for (const section of sections) {
        for (const entry of section.hands) {
            const playerId = getPlayerId(section.space, entry.spaceUserId);
            if (playerId !== undefined) {
                playerIds.add(playerId);
            }
        }
    }
    return playerIds;
});
