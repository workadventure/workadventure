import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { writable } from "svelte/store";

// A controllable RemotePeer double: records the onDestroy callback and the connectionId,
// and faithfully replays destroy() -> onDestroy(intentionalClose) so the retry wiring is exercised.
const { RemotePeerMock, remotePeerInstances } = vi.hoisted(() => {
    class RemotePeerMock {
        public readonly user: unknown;
        public readonly connectionId: string;
        public readonly uniqueId: string;
        public destroyed = false;
        private intentionalClose = false;
        private readonly onDestroy: (intentionalClose: boolean) => void;

        public readonly markAsIntentionalClose = vi.fn(() => {
            this.intentionalClose = true;
        });
        public readonly destroy = vi.fn(() => {
            if (this.destroyed) {
                return;
            }
            this.destroyed = true;
            this.onDestroy(this.intentionalClose);
        });
        public readonly on = vi.fn();
        public readonly dispatchStream = vi.fn();

        constructor(...args: unknown[]) {
            this.user = args[0];
            this.onDestroy = args[9] as (intentionalClose: boolean) => void;
            this.connectionId = args[10] as string;
            this.uniqueId = `peer-${instances.length}`;
            instances.push(this);
        }
    }
    const instances: RemotePeerMock[] = [];
    return { RemotePeerMock, remotePeerInstances: instances };
});

vi.mock("../../../src/front/WebRtc/RemotePeer", () => ({ RemotePeer: RemotePeerMock }));
vi.mock("../../../src/front/WebRtc/IceServersManager", () => ({
    iceServersManager: { getIceServersConfig: vi.fn().mockResolvedValue([]) },
}));
// Cut the heavy media/store import chain pulled in transitively by SimplePeer (MediaStore ->
// MediaManager -> ScreenSharingStore), which runs top-level derived() calls that need a full app runtime.
vi.mock("../../../src/front/WebRtc/MediaManager", () => ({ mediaManager: {}, MediaManager: vi.fn() }));
vi.mock("../../../src/front/Stores/ScreenSharingStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        requestedScreenSharingState: writable(false),
        screenSharingLocalStreamStore: writable({ type: "success", stream: undefined }),
        screenShareQualityStore: writable("recommended"),
        screenSharingAvailableStore: writable(false),
    };
});
vi.mock("../../../src/front/Stores/MegaphoneStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        liveStreamingEnabledStore: writable(false),
        requestedMegaphoneStore: writable(false),
        megaphoneSpaceStore: writable(undefined),
        megaphoneCanBeUsedStore: writable(false),
    };
});
vi.mock("../../../src/front/Stores/NoMicrophoneSoundWarningVisibleStore", async () => {
    const { writable } = await import("svelte/store");
    return { noMicrophoneSoundWarningVisibleStore: writable(false) };
});
vi.mock("../../../src/front/Stores/OrderedStreamableCollectionStore", async () => {
    const { writable } = await import("svelte/store");
    return { triggerReorderStore: writable(0) };
});
vi.mock("../../../src/front/Stores/StreamableCollectionStore", async () => {
    const { writable } = await import("svelte/store");
    return { streamableCollectionStore: writable([]) };
});

import { SimplePeer } from "../../../src/front/WebRtc/SimplePeer";
import type { SpaceInterface } from "../../../src/front/Space/SpaceInterface";

const BOB = "bob";

function makeSpace() {
    const channels = new Map<string, Subject<unknown>>();
    const observePrivateEvent = vi.fn((name: string) => {
        let channel = channels.get(name);
        if (!channel) {
            channel = new Subject();
            channels.set(name, channel);
        }
        return channel;
    });

    const emitBackEvent = vi.fn();
    const getSpaceUserBySpaceUserId = vi.fn(() => ({ spaceUserId: BOB, uuid: `uuid-${BOB}` }));

    const space = {
        observePrivateEvent,
        emitBackEvent,
        getSpaceUserBySpaceUserId,
        getSpaceName: () => "test-space",
    } as unknown as SpaceInterface;

    const emitWebRtcStart = (connectionId: string, initiator: boolean) => {
        channels.get("webRtcStartMessage")?.next({
            webRtcStartMessage: { connectionId, initiator },
            sender: { spaceUserId: BOB, uuid: `uuid-${BOB}` },
        });
    };

    return { space, emitBackEvent, emitWebRtcStart };
}

function makeStreamableSubjects() {
    return {
        videoPeerAdded: new Subject(),
        videoPeerRemoved: new Subject(),
        screenSharingPeerAdded: new Subject(),
        screenSharingPeerRemoved: new Subject(),
    };
}

describe("SimplePeer connectionId replacement", () => {
    beforeEach(() => {
        remotePeerInstances.length = 0;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("marks the superseded peer as an intentional close and does not trigger the retry flow", async () => {
        const { space, emitBackEvent, emitWebRtcStart } = makeSpace();
        const analyticsClient = {
            addNewParticipant: vi.fn(),
            retryConnectionWebRtc: vi.fn(),
        };

        // Spy on the private retry entrypoint: replacing a live peer must NOT enter it.
        const handleConnectionFailureSpy = vi.spyOn(
            SimplePeer.prototype as unknown as { handleConnectionFailure: (...args: unknown[]) => void },
            "handleConnectionFailure",
        );

        new SimplePeer(
            space,
            makeStreamableSubjects() as never,
            writable(new Set<string>()),
            writable(undefined),
            analyticsClient as never,
            { info: vi.fn() } as never,
            writable(undefined) as never,
        );

        // First webRtcStart establishes the connection with connectionId "conn-1".
        emitWebRtcStart("conn-1", true);
        await vi.waitFor(() => expect(remotePeerInstances).toHaveLength(1));
        const firstPeer = remotePeerInstances[0];

        // Second webRtcStart carries a new connectionId "conn-2": the backend replaced the connection.
        emitWebRtcStart("conn-2", false);
        await vi.waitFor(() => expect(remotePeerInstances).toHaveLength(2));

        // The superseded peer is torn down as an intentional close (Copilot's fix)...
        expect(firstPeer.markAsIntentionalClose).toHaveBeenCalled();
        expect(firstPeer.destroy).toHaveBeenCalled();
        // ...so the internal replacement never enters the retry flow, and no stale restart / analytics is produced.
        expect(handleConnectionFailureSpy).not.toHaveBeenCalled();
        expect(analyticsClient.retryConnectionWebRtc).not.toHaveBeenCalled();
        expect(
            emitBackEvent.mock.calls.some(
                (call) => call[0]?.event?.$case === "meetingConnectionRestartMessage",
            ),
        ).toBe(false);

        // The replacement peer is created with the new connectionId.
        expect(remotePeerInstances[1].connectionId).toBe("conn-2");
    });
});
