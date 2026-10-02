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
import { iceServersManager } from "../../../src/front/WebRtc/IceServersManager";
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
    const userLeft = new Subject<{ spaceUserId: string }>();
    const getSpaceUserBySpaceUserId = vi.fn(() => ({ spaceUserId: BOB, uuid: `uuid-${BOB}` }));

    const space = {
        observePrivateEvent,
        emitBackEvent,
        getSpaceUserBySpaceUserId,
        getSpaceName: () => "test-space",
        observeUserLeft: userLeft,
    } as unknown as SpaceInterface;

    const emitWebRtcStart = (connectionId: string, initiator: boolean) => {
        channels.get("webRtcStartMessage")?.next({
            webRtcStartMessage: { connectionId, initiator },
            sender: { spaceUserId: BOB, uuid: `uuid-${BOB}` },
        });
    };

    return { space, emitBackEvent, emitWebRtcStart, userLeft };
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
        // One entry point, because that is what the client exposes now. The stub used
        // to name the two methods this path calls, and a stub that names methods goes
        // stale in silence: the call throws inside peer creation, the replacement
        // never reaches markAsIntentionalClose, and the failure points at the teardown
        // rather than at the stub.
        const analyticsClient = { trackAdminEvent: vi.fn() };

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
        expect(analyticsClient.trackAdminEvent).not.toHaveBeenCalledWith("media.connection_retry", expect.anything());
        expect(
            emitBackEvent.mock.calls.some((call) => call[0]?.event?.$case === "meetingConnectionRestartMessage"),
        ).toBe(false);

        // The replacement peer is created with the new connectionId.
        expect(remotePeerInstances[1].connectionId).toBe("conn-2");
    });
});

describe("SimplePeer restart request without answer", () => {
    beforeEach(() => {
        remotePeerInstances.length = 0;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("schedules the next backoff attempt when the back never answers the restart request", async () => {
        const { space, emitBackEvent, emitWebRtcStart } = makeSpace();
        const restartRequests = () =>
            emitBackEvent.mock.calls
                .map((call) => call[0]?.event)
                .filter((event) => event?.$case === "meetingConnectionRestartMessage")
                .map((event) => event.meetingConnectionRestartMessage);

        new SimplePeer(
            space,
            makeStreamableSubjects() as never,
            writable(new Set<string>()),
            writable(undefined),
            { trackAdminEvent: vi.fn() } as never,
            { info: vi.fn() } as never,
            writable(undefined) as never,
        );

        emitWebRtcStart("conn-1", true);
        await vi.waitFor(() => expect(remotePeerInstances).toHaveLength(1));

        // The peer dies for real: first backoff attempt (500 ms) sends a restart for conn-1.
        remotePeerInstances[0].destroy();
        await vi.advanceTimersByTimeAsync(500);
        expect(restartRequests()).toEqual([{ userId: BOB, connectionId: "conn-1" }]);

        // No webRtcStartMessage comes back: the next attempt (600 ms) fires after the answer timeout,
        // without the connectionId so that the back does not discard it as stale.
        await vi.advanceTimersByTimeAsync(10_000 + 600);
        expect(restartRequests()).toEqual([
            { userId: BOB, connectionId: "conn-1" },
            { userId: BOB, connectionId: undefined },
        ]);

        // The back finally answers: no further restart is sent.
        emitWebRtcStart("conn-2", false);
        await vi.waitFor(() => expect(remotePeerInstances).toHaveLength(2));
        await vi.advanceTimersByTimeAsync(30_000);
        expect(restartRequests()).toHaveLength(2);
    });
});

describe("SimplePeer peer lifecycle", () => {
    beforeEach(() => {
        remotePeerInstances.length = 0;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function createSimplePeer(space: SpaceInterface) {
        return new SimplePeer(
            space,
            makeStreamableSubjects() as never,
            writable(new Set<string>()),
            writable(undefined),
            { trackAdminEvent: vi.fn() } as never,
            { info: vi.fn() } as never,
            writable(undefined) as never,
        );
    }

    function spyOnRetryEntrypoint() {
        return vi.spyOn(
            SimplePeer.prototype as unknown as { handleConnectionFailure: (...args: unknown[]) => void },
            "handleConnectionFailure",
        );
    }

    it("closes the peer of a user who left the space without entering the retry flow", async () => {
        const { space, emitWebRtcStart, userLeft } = makeSpace();
        const handleConnectionFailureSpy = spyOnRetryEntrypoint();
        createSimplePeer(space);

        emitWebRtcStart("conn-1", true);
        await vi.waitFor(() => expect(remotePeerInstances).toHaveLength(1));

        userLeft.next({ spaceUserId: BOB });

        expect(remotePeerInstances[0].markAsIntentionalClose).toHaveBeenCalled();
        expect(remotePeerInstances[0].destroy).toHaveBeenCalled();
        expect(handleConnectionFailureSpy).not.toHaveBeenCalled();
    });

    it("registers the replacement peer even when the superseded one is still starting up", async () => {
        const { space, emitWebRtcStart } = makeSpace();
        const handleConnectionFailureSpy = spyOnRetryEntrypoint();
        let releaseFirstStartup: (iceServers: never[]) => void = () => {};
        vi.mocked(iceServersManager).getIceServersConfig.mockReturnValueOnce(
            new Promise((resolve) => {
                releaseFirstStartup = resolve;
            }),
        );
        createSimplePeer(space);

        // The first start is stuck waiting for the ICE servers when the replacement arrives.
        emitWebRtcStart("conn-1", true);
        emitWebRtcStart("conn-2", false);
        await vi.waitFor(() => expect(remotePeerInstances).toHaveLength(1));
        expect(remotePeerInstances[0].connectionId).toBe("conn-2");

        // The superseded start completes: it must neither create a peer nor count as a failure.
        releaseFirstStartup([]);
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
        expect(remotePeerInstances).toHaveLength(1);
        expect(handleConnectionFailureSpy).not.toHaveBeenCalled();
    });
});
