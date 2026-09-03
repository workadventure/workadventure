import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionState, DisconnectReason } from "livekit-client";
import type * as LivekitClient from "livekit-client";
import type { Readable } from "svelte/store";
import type { LocalStreamStoreValue } from "../Stores/MediaStore";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { Streamable } from "../Space/Streamable";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { LiveKitRoom } from "./LiveKitRoom";

const audioPlaybackStoreMock = vi.hoisted(() => {
    const subscribers = new Set<(value: ReadonlySet<unknown>) => void>();
    const value = new Set<unknown>();

    return {
        register: vi.fn(),
        subscribe: vi.fn((subscriber: (value: ReadonlySet<unknown>) => void) => {
            subscribers.add(subscriber);
            subscriber(value);
            return () => {
                subscribers.delete(subscriber);
            };
        }),
    };
});

vi.mock("../Stores/AudioPlaybackStore", () => ({ audioPlaybackStore: audioPlaybackStoreMock }));

vi.mock("../Stores/ScreenSharingStore", async () => {
    const { writable } = await import("svelte/store");
    const requestedScreenSharingState = writable(false);
    return {
        requestedScreenSharingState,
        screenSharingLocalStreamStore: writable({ type: "success", stream: undefined }),
        screenShareQualityStore: writable("recommended"),
    };
});

vi.mock("../Stores/MegaphoneStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        liveStreamingEnabledStore: writable(false),
        requestedMegaphoneStore: writable(false),
        megaphoneSpaceStore: writable(undefined),
        megaphoneCanBeUsedStore: writable(false),
    };
});

vi.mock("../WebRtc/MediaManager", () => ({
    mediaManager: {},
    MediaManager: vi.fn(),
}));

vi.mock("../Stores/NoMicrophoneSoundWarningVisibleStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        noMicrophoneSoundWarningVisibleStore: writable(false),
    };
});

vi.mock("../Stores/OrderedStreamableCollectionStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        triggerReorderStore: writable(0),
    };
});

vi.mock("../Stores/StreamableCollectionStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        streamableCollectionStore: writable([]),
    };
});

vi.mock("../Space/SpacePeerManager/SpacePeerManager", () => ({}));

// The real LocalVideoTrack / LocalAudioTrack need a browser MediaStreamTrack. Keep the surface LiveKitRoom uses.
vi.mock("livekit-client", async (importOriginal) => {
    const actual = await importOriginal<typeof LivekitClient>();
    class FakeLocalTrack {
        public isUpstreamPaused = false;
        public resumeUpstream = vi.fn().mockResolvedValue(undefined);
        public pauseUpstream = vi.fn().mockResolvedValue(undefined);
        public replaceTrack = vi.fn().mockResolvedValue(undefined);
        constructor(public mediaStreamTrack: MediaStreamTrack) {}
    }
    return { ...actual, LocalVideoTrack: FakeLocalTrack, LocalAudioTrack: FakeLocalTrack };
});

describe("LiveKitRoom", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("registers one retry that restarts blocked LiveKit audio", async () => {
        const unregister = vi.fn();
        audioPlaybackStoreMock.register.mockReturnValue(unregister);
        const liveKitRoom = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        const startAudio = vi.fn().mockResolvedValue(undefined);
        const sdkRoom = {
            canPlaybackAudio: false,
            startAudio,
        };
        liveKitRoom["room"] = sdkRoom as never;

        liveKitRoom["handleAudioPlaybackStatusChanged"]();
        liveKitRoom["handleAudioPlaybackStatusChanged"]();

        expect(audioPlaybackStoreMock.register).toHaveBeenCalledOnce();
        const retry = audioPlaybackStoreMock.register.mock.calls[0][0] as () => Promise<void>;
        await retry();
        expect(startAudio).toHaveBeenCalledOnce();

        sdkRoom.canPlaybackAudio = true;
        liveKitRoom["handleAudioPlaybackStatusChanged"]();
        expect(unregister).toHaveBeenCalledOnce();
    });

    it("unregisters blocked audio playback when destroyed", () => {
        const unregister = vi.fn();
        audioPlaybackStoreMock.register.mockReturnValue(unregister);
        const liveKitRoom = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        liveKitRoom["room"] = {
            canPlaybackAudio: false,
            startAudio: vi.fn(),
            off: vi.fn(),
            disconnect: vi.fn().mockResolvedValue(undefined),
        } as never;
        liveKitRoom["handleAudioPlaybackStatusChanged"]();

        liveKitRoom.destroy();

        expect(unregister).toHaveBeenCalledOnce();
    });

    it("should publish the camera again after a failed publication", async () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        const publishTrack = vi
            .fn()
            .mockRejectedValueOnce(new Error("publishing rejected as engine not connected within timeout"))
            .mockResolvedValue(undefined);
        room["room"] = { state: ConnectionState.Connected } as never;
        room["localParticipant"] = { publishTrack } as never;
        const cameraStream = createCameraStream();

        await expect(room["handleCameraTrack"](cameraStream)).rejects.toThrow("engine not connected");
        expect(room["localCameraTrack"]).toBeUndefined();

        await room["handleCameraTrack"](cameraStream);

        expect(publishTrack).toHaveBeenCalledTimes(2);
        expect(room["localCameraTrack"]?.mediaStreamTrack.id).toBe("camera-track");
    });

    it("should skip camera publication while reconnecting and replay it once reconnected", async () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        const publishTrack = vi.fn().mockResolvedValue(undefined);
        const sdkRoom = { state: ConnectionState.Reconnecting };
        room["room"] = sdkRoom as never;
        room["localParticipant"] = { publishTrack } as never;
        const cameraStream = createCameraStream();
        room["cameraStreamStore"] = writable(cameraStream);

        await room["handleCameraTrack"](cameraStream);
        expect(publishTrack).not.toHaveBeenCalled();

        sdkRoom.state = ConnectionState.Connected;
        room["handleReconnected"]();
        await room["mediaTrackUpdateQueue"];

        expect(publishTrack).toHaveBeenCalledOnce();
        expect(room["localCameraTrack"]?.mediaStreamTrack.id).toBe("camera-track");
    });

    describe("handleDisconnected", () => {
        function createDisconnectedRoom() {
            const decrement = vi.fn();
            const emitBackEvent = vi.fn();
            const room = createLiveKitRoom({
                screenSharingLocalStreamStore: writable(undefined),
                shouldPublishScreenShareStore: writable(false),
                livekitRoomCounter: { increment: vi.fn(), decrement },
                emitBackEvent,
            });
            room["room"] = { off: vi.fn(), disconnect: vi.fn().mockResolvedValue(undefined) } as never;
            room["everConnected"] = true;
            return { room, decrement, emitBackEvent };
        }

        it("should tear the room down and ask for a new invitation when livekit-client gives up reconnecting", () => {
            const { room, decrement, emitBackEvent } = createDisconnectedRoom();

            room["handleDisconnected"](undefined);

            expect(decrement).toHaveBeenCalledOnce();
            expect(emitBackEvent).toHaveBeenCalledWith({
                event: { $case: "meetingConnectionRestartMessage", meetingConnectionRestartMessage: {} },
            });
        });

        it("should delay the new invitation request when the room never connected", () => {
            vi.useFakeTimers();
            const { room, decrement, emitBackEvent } = createDisconnectedRoom();
            room["everConnected"] = false;

            room["handleDisconnected"](DisconnectReason.JOIN_FAILURE);

            expect(decrement).toHaveBeenCalledOnce();
            expect(emitBackEvent).not.toHaveBeenCalled();
            vi.advanceTimersByTime(5000);
            expect(emitBackEvent).toHaveBeenCalledOnce();
        });

        it("should tear the room down without restarting on a duplicate identity", () => {
            const { room, decrement, emitBackEvent } = createDisconnectedRoom();

            room["handleDisconnected"](DisconnectReason.DUPLICATE_IDENTITY);

            expect(decrement).toHaveBeenCalledOnce();
            expect(emitBackEvent).not.toHaveBeenCalled();
        });

        it("should do nothing when the client initiated the disconnection", () => {
            const { room, decrement, emitBackEvent } = createDisconnectedRoom();

            room["handleDisconnected"](DisconnectReason.CLIENT_INITIATED);

            expect(decrement).not.toHaveBeenCalled();
            expect(emitBackEvent).not.toHaveBeenCalled();
        });

        it("should only destroy the room once", () => {
            const { room, decrement } = createDisconnectedRoom();

            room["handleDisconnected"](undefined);
            room.destroy();

            expect(decrement).toHaveBeenCalledOnce();
        });
    });

    it("should not forward screen share updates when the space forbids screen share publication", () => {
        const shouldPublishScreenShareStore = writable(false);
        const screenShareStream = createScreenShareStream();
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(screenShareStream),
            shouldPublishScreenShareStore,
        });
        const queueScreenShareUpdate = vi.fn();
        room["queueScreenShareUpdate"] = queueScreenShareUpdate;

        room["synchronizeMediaState"]();

        expect(queueScreenShareUpdate).toHaveBeenLastCalledWith(undefined);
    });

    it("should stop forwarding screen share updates when the space stops allowing screen share publication", () => {
        const shouldPublishScreenShareStore = writable(true);
        const screenShareStream = createScreenShareStream();
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(screenShareStream),
            shouldPublishScreenShareStore,
        });
        const queueScreenShareUpdate = vi.fn();
        room["queueScreenShareUpdate"] = queueScreenShareUpdate;

        room["synchronizeMediaState"]();
        shouldPublishScreenShareStore.set(false);

        expect(queueScreenShareUpdate).toHaveBeenLastCalledWith(undefined);
    });
});

function createLiveKitRoom({
    screenSharingLocalStreamStore,
    shouldPublishScreenShareStore,
    livekitRoomCounter = { increment: vi.fn(), decrement: vi.fn() },
    emitBackEvent = vi.fn(),
}: {
    screenSharingLocalStreamStore: Readable<LocalStreamStoreValue | undefined>;
    shouldPublishScreenShareStore: Readable<boolean>;
    livekitRoomCounter?: { increment: () => void; decrement: () => void };
    emitBackEvent?: SpaceInterface["emitBackEvent"];
}): LiveKitRoom {
    return new LiveKitRoom(
        "wss://livekit.example.com",
        "token",
        createSpace(shouldPublishScreenShareStore, emitBackEvent),
        createStreamableSubjects(),
        writable(new Set<string>()),
        new AbortController().signal,
        screenSharingLocalStreamStore,
        writable(undefined),
        livekitRoomCounter,
        writable({ type: "success", stream: undefined }),
    );
}

function createSpace(
    shouldPublishScreenShareStore: Readable<boolean>,
    emitBackEvent: SpaceInterface["emitBackEvent"],
): SpaceInterface {
    return {
        isStreamingVideoStore: writable(false),
        isStreamingAudioStore: writable(false),
        shouldPublishScreenShareStore,
        emitBackEvent,
    } as unknown as SpaceInterface;
}

function createCameraStream(): LocalStreamStoreValue {
    const track = {
        id: "camera-track",
        kind: "video",
        getSettings: () => ({ width: 1280, height: 720 }),
    } as unknown as MediaStreamTrack;
    return {
        type: "success",
        stream: { getVideoTracks: () => [track], getAudioTracks: () => [] } as unknown as MediaStream,
    };
}

function createStreamableSubjects(): StreamableSubjects {
    return {
        videoPeerAdded: new Subject<Streamable>(),
        videoPeerRemoved: new Subject<Streamable>(),
        screenSharingPeerAdded: new Subject<Streamable>(),
        screenSharingPeerRemoved: new Subject<Streamable>(),
    };
}

function createScreenShareStream(): LocalStreamStoreValue {
    return {
        type: "success",
        stream: { id: "screen-share-stream" } as unknown as MediaStream,
    };
}
