import { type Readable, type Unsubscriber, get, readable } from "svelte/store";
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
 * Set of user UUIDs (meeting participants) whose hand is currently raised.
 * Used to drive the raised-hand indicator above the woka on the map: the woka is keyed by uuid via
 * RemotePlayersRepository.getPlayerByUuid(), so the map indicator comes from the same (space-persisted)
 * SpaceUser state as the video tiles — including for participants who joined after the hand was raised.
 */
function createRaisedHandUuidsStore(): Readable<Set<string>> {
    return readable(new Set<string>(), (set) => {
        let innerUnsubscribers: Unsubscriber[] = [];
        // uuid -> raised. A uuid may be backed by several boxes (camera + screen share); last write wins,
        // which is fine because handRaised is a per-user value shared by all of that user's boxes.
        const raisedByUuid = new Map<string, boolean>();

        const recompute = (): void => {
            const raised = new Set<string>();
            for (const [uuid, isRaised] of raisedByUuid) {
                if (isRaised) {
                    raised.add(uuid);
                }
            }
            set(raised);
        };

        const outerUnsubscriber = streamableCollectionStore.subscribe((boxes) => {
            innerUnsubscribers.forEach((unsubscribe) => unsubscribe());
            innerUnsubscribers = [];
            raisedByUuid.clear();

            for (const box of boxes.values()) {
                // uuid never changes for a given user, so a one-time read is enough.
                const uuid = get(box.spaceUser.reactiveUser.uuid);
                if (!uuid) {
                    continue;
                }
                innerUnsubscribers.push(
                    box.spaceUser.reactiveUser.handRaised.subscribe((isRaised) => {
                        raisedByUuid.set(uuid, isRaised);
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
 * Readable set of UUIDs of meeting participants whose hand is currently raised.
 */
export const raisedHandUuidsStore = createRaisedHandUuidsStore();
