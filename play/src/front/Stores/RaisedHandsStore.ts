import { type Readable, type Unsubscriber, readable } from "svelte/store";
import type { VideoBox } from "../Space/VideoBox";
import { streamableCollectionStore } from "./StreamableCollectionStore";

interface RaisedHandInfo {
    raised: boolean;
    at: number;
}

/**
 * Maps each video tile (`VideoBox.uniqueId`) whose user currently raised their hand to its 1-based position
 * in the "who raised first" order (sorted by the moment the hand was raised).
 *
 * The set of tiles comes from {@link streamableCollectionStore} (local camera + remote peers). That store does
 * not re-emit when an inner `handRaised`/`handRaisedAt` reactive value changes, so we subscribe to those values
 * for every tile ourselves and recompute the ordering whenever any of them changes.
 */
function createRaisedHandsOrderStore(): Readable<Map<string, number>> {
    return readable(new Map<string, number>(), (set) => {
        let innerUnsubscribers: Unsubscriber[] = [];
        const raisedInfoByUniqueId = new Map<string, RaisedHandInfo>();

        const recompute = (): void => {
            const positions = new Map<string, number>();
            [...raisedInfoByUniqueId.entries()]
                .filter(([, info]) => info.raised)
                .sort((a, b) => a[1].at - b[1].at || a[0].localeCompare(b[0]))
                .forEach(([uniqueId], index) => positions.set(uniqueId, index + 1));
            set(positions);
        };

        const watchBox = (box: VideoBox): void => {
            const uniqueId = box.uniqueId;
            const info: RaisedHandInfo = { raised: false, at: 0 };
            raisedInfoByUniqueId.set(uniqueId, info);

            innerUnsubscribers.push(
                box.spaceUser.reactiveUser.handRaised.subscribe((raised) => {
                    info.raised = raised;
                    recompute();
                }),
            );
            innerUnsubscribers.push(
                box.spaceUser.reactiveUser.handRaisedAt.subscribe((at) => {
                    info.at = at;
                    recompute();
                }),
            );
        };

        const outerUnsubscriber = streamableCollectionStore.subscribe((boxes) => {
            innerUnsubscribers.forEach((unsubscribe) => unsubscribe());
            innerUnsubscribers = [];
            raisedInfoByUniqueId.clear();

            for (const box of boxes.values()) {
                watchBox(box);
            }
            recompute();
        });

        return () => {
            outerUnsubscriber();
            innerUnsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    });
}

/**
 * Readable map: `VideoBox.uniqueId` → 1-based raise-hand order position.
 * A tile is absent from the map when its user has not raised their hand.
 */
export const raisedHandsOrderStore = createRaisedHandsOrderStore();

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
 * Set of numeric player ids (one per meeting participant whose hand is raised), derived from each
 * participant's spaceUserId. Drives the raised-hand indicator above the woka on the map.
 *
 * We key by the spaceUserId-derived player id rather than by uuid: a uuid is shared by all connections of
 * the same user (e.g. multiple tabs), whereas each connection has its own spaceUserId — and its own woka.
 * Keying by spaceUserId therefore points at the correct woka and stays consistent with the video tiles
 * (which are keyed by spaceUserId via VideoBox.uniqueId).
 */
function createRaisedHandPlayerIdsStore(): Readable<Set<number>> {
    return readable(new Set<number>(), (set) => {
        let innerUnsubscribers: Unsubscriber[] = [];
        // playerId -> raised. A player may be backed by several boxes (camera + screen share); last write
        // wins, which is fine because handRaised is a per-user value shared by all of that user's boxes.
        const raisedByPlayerId = new Map<number, boolean>();

        const recompute = (): void => {
            const raised = new Set<number>();
            for (const [playerId, isRaised] of raisedByPlayerId) {
                if (isRaised) {
                    raised.add(playerId);
                }
            }
            set(raised);
        };

        const outerUnsubscriber = streamableCollectionStore.subscribe((boxes) => {
            innerUnsubscribers.forEach((unsubscribe) => unsubscribe());
            innerUnsubscribers = [];
            raisedByPlayerId.clear();

            for (const box of boxes.values()) {
                // spaceUserId is the unique per-connection id and encodes the woka's numeric player id.
                const playerId = getPlayerIdFromSpaceUserId(box.spaceUser.spaceUserId);
                if (playerId === undefined) {
                    // Local user ("local") or unexpected format: the local woka is handled separately.
                    continue;
                }
                innerUnsubscribers.push(
                    box.spaceUser.reactiveUser.handRaised.subscribe((isRaised) => {
                        raisedByPlayerId.set(playerId, isRaised);
                        recompute();
                    }),
                );
            }
            recompute();
        });

        return () => {
            outerUnsubscriber();
            innerUnsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    });
}

/**
 * Readable set of numeric player ids of meeting participants whose hand is currently raised.
 */
export const raisedHandPlayerIdsStore = createRaisedHandPlayerIdsStore();
