import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import type { Readable } from "svelte/store";
import type { LocalStreamStoreValue } from "../Stores/MediaStore";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { Streamable } from "../Space/Streamable";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { LiveKitRoom } from "./LiveKitRoom";

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
