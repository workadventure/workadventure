import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/svelte", () => ({ captureException }));

import { ProximityChatRoomManager } from "../../../src/front/Chat/Connection/Proximity/ProximityChatRoomManager";
import type { ProximityChatRoom } from "../../../src/front/Chat/Connection/Proximity/ProximityChatRoom";
import type { RoomConnection } from "../../../src/front/Connection/RoomConnection";
import { ProximitySpaceManager } from "../../../src/front/WebRtc/ProximitySpaceManager";

describe("ProximitySpaceManager", () => {
    it("aborts the join of a bubble left before it was joined, so the next bubble does not wait for it", async () => {
        const joinSpaceRequestMessage = new Subject<{ spaceName: string; propertiesToSync: string[] }>();
        const leaveSpaceRequestMessage = new Subject<{ spaceName: string }>();
        // Like ProximityChatRoom.joinSpace waiting in getFirstUsers for a peer who already left: only an abort ends it.
        const joinSignals = new Map<string, AbortSignal | undefined>();
        const joinSpace = vi.fn(
            (spaceName: string, ...args: [string[], boolean, unknown, boolean, AbortSignal | undefined]) =>
                new Promise((_, reject) => {
                    const signal = args[4];
                    joinSignals.set(spaceName, signal);
                    const abort = () => reject(new DOMException("signal is aborted without reason", "AbortError"));
                    if (signal?.aborted) {
                        abort();
                    }
                    signal?.addEventListener("abort", abort, { once: true });
                }),
        );
        const leaveSpace = vi.fn(() => Promise.resolve(false));
        const manager = new ProximityChatRoomManager(
            (spaceName, _displayName, kind) =>
                ({
                    spaceName,
                    kind: writable(kind),
                    setDisplayName: vi.fn(),
                    joinSpace,
                    leaveSpace,
                }) as unknown as ProximityChatRoom,
        );
        new ProximitySpaceManager(
            { joinSpaceRequestMessage, leaveSpaceRequestMessage } as unknown as RoomConnection,
            manager,
        );

        // The bubbles dissolve right after forming, before the previous join is over.
        for (const spaceName of ["bubble-1", "bubble-2"]) {
            joinSpaceRequestMessage.next({ spaceName, propertiesToSync: [] });
            leaveSpaceRequestMessage.next({ spaceName });
        }
        joinSpaceRequestMessage.next({ spaceName: "bubble-3", propertiesToSync: [] });

        await vi.waitFor(() => expect(joinSignals.has("bubble-3")).toBe(true));
        expect(joinSignals.get("bubble-1")?.aborted).toBe(true);
        expect(joinSignals.get("bubble-2")?.aborted).toBe(true);
        expect(joinSignals.get("bubble-3")?.aborted).toBe(false);
        expect(leaveSpace.mock.calls).toEqual([
            ["bubble-1", false],
            ["bubble-2", false],
        ]);
        // Aborted on purpose, so not an error. (The lock reports failed operations on its own, with a second argument.)
        expect(captureException.mock.calls.filter((call) => call.length === 1)).toEqual([]);
    });
});
