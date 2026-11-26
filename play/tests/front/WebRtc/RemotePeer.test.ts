import { EventEmitter } from "events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";

// simple-peer without a real RTCPeerConnection: the handlers RemotePeer registers are driven by emit()
vi.mock("@workadventure/simple-peer", () => ({
    default: class FakePeer extends EventEmitter {
        public _pc = undefined;
        public negotiate = vi.fn();
        public destroy = vi.fn();
        constructor(_options: unknown) {
            super();
        }
    },
}));
// Cut the heavy media/store import chain (MediaStore -> MediaManager -> GameScene -> Phaser)
vi.mock("../../../src/front/Stores/MediaStore", async () => {
    const { writable } = await import("svelte/store");
    return { videoQualityStore: writable("recommended") };
});
vi.mock("../../../src/front/Stores/ScreenSharingStore", async () => {
    const { writable } = await import("svelte/store");
    return { screenShareQualityStore: writable("recommended") };
});
vi.mock("../../../src/front/Utils/E2EHooks", () => ({
    incrementWebRtcConnectionsCount: vi.fn(),
    decrementWebRtcConnectionsCount: vi.fn(),
}));
vi.mock("../../../src/front/WebRtc/VideoQualityAnalytics", () => ({
    subscribeToVideoQualityAnalytics: vi.fn(() => () => {}),
    subscribeToOutboundVideoQualityAnalytics: vi.fn(() => () => {}),
}));
vi.mock("../../../src/front/Stores/PeerStore", async () => {
    const { writable } = await import("svelte/store");
    return { volumeProximityDiscussionStore: writable(1) };
});

import { RemotePeer } from "../../../src/front/WebRtc/RemotePeer";
import type { SpaceInterface } from "../../../src/front/Space/SpaceInterface";

function createPeer(): RemotePeer {
    const space = {
        getSpaceUserBySpaceUserId: () => undefined,
        isStreamingVideoStore: writable(false),
        getName: () => "space",
        emitVideoQualityReport: vi.fn(),
        emitPrivateMessage: vi.fn(),
    } as unknown as SpaceInterface;
    return new RemotePeer(
        { userId: "david" },
        true,
        space,
        [],
        false,
        writable(undefined),
        "video",
        "david-space-user",
        writable(new Set<string>()),
        () => {},
        "connection-1",
    );
}

const CANDIDATE = { type: "candidate", candidate: { candidate: "candidate:1 1 udp 1 192.0.2.1 9 typ host" } };

describe("RemotePeer connect timer", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it("does not flag the peer in error after it recovers from an ICE outage", () => {
        const peer = createPeer();
        peer._connected = true;
        peer.emit("iceStateChange", "connected", "complete");

        // The outage shows "connecting", and the ICE restart gathers new candidates
        peer.emit("iceStateChange", "disconnected", "complete");
        peer.emit("signal", CANDIDATE);
        peer.emit("iceStateChange", "connected", "complete");
        vi.advanceTimersByTime(10_000);

        expect(get(peer.statusStore)).toBe("connected");
    });

    it("still flags a first connection that never comes in error", () => {
        const peer = createPeer();

        peer.emit("signal", CANDIDATE);
        vi.advanceTimersByTime(10_000);

        expect(get(peer.statusStore)).toBe("error");
    });
});
