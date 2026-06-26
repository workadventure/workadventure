import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("LiveKitRoom", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
}: {
    screenSharingLocalStreamStore: Readable<LocalStreamStoreValue | undefined>;
    shouldPublishScreenShareStore: Readable<boolean>;
}): LiveKitRoom {
    return new LiveKitRoom(
        "wss://livekit.example.com",
        "token",
        createSpace(shouldPublishScreenShareStore),
        createStreamableSubjects(),
        writable(new Set<string>()),
        new AbortController().signal,
        screenSharingLocalStreamStore,
        writable(undefined),
        {
            increment: vi.fn(),
            decrement: vi.fn(),
        },
        writable({ type: "success", stream: undefined }),
    );
}

function createSpace(shouldPublishScreenShareStore: Readable<boolean>): SpaceInterface {
    return {
        isStreamingVideoStore: writable(false),
        isStreamingAudioStore: writable(false),
        shouldPublishScreenShareStore,
    } as unknown as SpaceInterface;
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
