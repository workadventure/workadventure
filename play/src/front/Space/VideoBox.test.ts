import { afterEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import type { SpaceUserExtended } from "./SpaceInterface";
import type { Streamable, StreamCategory } from "./Streamable";
import { VideoBox } from "./VideoBox";

vi.mock("./localSpaceUser", () => ({
    localSpaceUser: vi.fn(),
}));

describe("VideoBox", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("keeps the current streamable visible until the pending streamable renders a frame", () => {
        vi.useFakeTimers();
        const activeStreamable = createStreamable("active");
        const pendingStreamable = createStreamable("pending");
        const videoBox = createVideoBox(activeStreamable);

        videoBox.setNewStreamable(pendingStreamable);

        expect(get(videoBox.streamable)).toBe(activeStreamable);
        expect(get(videoBox.pendingStreamable)).toBe(pendingStreamable);
        expect(get(videoBox.waitsForPendingFirstFrame)).toBe(true);
        expect(get(videoBox.streamables)).toEqual([
            { streamable: activeStreamable, isActive: true, waitsForFirstFrame: false },
            { streamable: pendingStreamable, isActive: false, waitsForFirstFrame: true },
        ]);

        videoBox.markStreamableRendered(pendingStreamable);

        expect(get(videoBox.streamable)).toBe(pendingStreamable);
        expect(get(videoBox.pendingStreamable)).toBeUndefined();
        expect(get(videoBox.waitsForPendingFirstFrame)).toBe(false);
        expect(get(videoBox.streamables)).toEqual([
            { streamable: pendingStreamable, isActive: true, waitsForFirstFrame: false },
        ]);
        vi.runOnlyPendingTimers();
        expect(activeStreamable.closeStreamable).toHaveBeenCalledOnce();
    });

    it("promotes the pending streamable after the first frame timeout", () => {
        vi.useFakeTimers();
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const activeStreamable = createStreamable("active");
        const pendingStreamable = createStreamable("pending");
        const videoBox = createVideoBox(activeStreamable);

        videoBox.setNewStreamable(pendingStreamable);

        vi.advanceTimersByTime(4_999);
        expect(get(videoBox.streamable)).toBe(activeStreamable);

        vi.advanceTimersByTime(1);
        expect(get(videoBox.streamable)).toBe(pendingStreamable);
        expect(get(videoBox.pendingStreamable)).toBeUndefined();
        expect(get(videoBox.streamables)).toEqual([
            { streamable: pendingStreamable, isActive: true, waitsForFirstFrame: false },
        ]);
        vi.runOnlyPendingTimers();
        expect(activeStreamable.closeStreamable).toHaveBeenCalledOnce();
    });

    it("promotes audio-only streamables immediately", () => {
        vi.useFakeTimers();
        const activeStreamable = createStreamable("active");
        const audioOnlyStreamable = createStreamable("audio-only", { hasVideo: false });
        const videoBox = createVideoBox(activeStreamable, { cameraState: false });

        videoBox.setNewStreamable(audioOnlyStreamable);

        expect(get(videoBox.streamable)).toBe(audioOnlyStreamable);
        expect(get(videoBox.pendingStreamable)).toBeUndefined();
        expect(get(videoBox.waitsForPendingFirstFrame)).toBe(false);
        expect(get(videoBox.streamables)).toEqual([
            { streamable: audioOnlyStreamable, isActive: true, waitsForFirstFrame: false },
        ]);
        vi.runOnlyPendingTimers();
        expect(activeStreamable.closeStreamable).toHaveBeenCalledOnce();
    });

    it("promotes the pending streamable if the current streamable is removed first", () => {
        const activeStreamable = createStreamable("active");
        const pendingStreamable = createStreamable("pending");
        const videoBox = createVideoBox(activeStreamable);

        videoBox.setNewStreamable(pendingStreamable);
        videoBox.removeStreamable(activeStreamable);

        expect(get(videoBox.streamable)).toBe(pendingStreamable);
        expect(get(videoBox.pendingStreamable)).toBeUndefined();
        expect(get(videoBox.streamables)).toEqual([
            { streamable: pendingStreamable, isActive: true, waitsForFirstFrame: false },
        ]);
        expect(activeStreamable.closeStreamable).not.toHaveBeenCalled();
    });

    it("ignores first-frame events from stale pending streamables", () => {
        const activeStreamable = createStreamable("active");
        const pendingStreamable = createStreamable("pending");
        const staleStreamable = createStreamable("stale");
        const videoBox = createVideoBox(activeStreamable);

        videoBox.setNewStreamable(pendingStreamable);
        videoBox.markStreamableRendered(staleStreamable);

        expect(get(videoBox.streamable)).toBe(activeStreamable);
        expect(get(videoBox.pendingStreamable)).toBe(pendingStreamable);

        videoBox.destroy(true);
    });
});

function createVideoBox(
    streamable: Streamable,
    options: { cameraState?: boolean; screenSharingState?: boolean } = {}
): VideoBox {
    return new VideoBox("user-1", createSpaceUser(options), streamable, 0, 0);
}

function createSpaceUser({
    cameraState = true,
    screenSharingState = false,
}: {
    cameraState?: boolean;
    screenSharingState?: boolean;
} = {}): SpaceUserExtended {
    return {
        spaceUserId: "user-1",
        name: "Alice",
        reactiveUser: {
            spaceUserId: "user-1",
            playUri: undefined,
            roomName: undefined,
            cameraState: writable(cameraState),
            screenSharingState: writable(screenSharingState),
        },
    } as unknown as SpaceUserExtended;
}

function createStreamable(
    uniqueId: string,
    options: { hasVideo?: boolean; videoType?: StreamCategory } = {}
): Streamable {
    return {
        uniqueId,
        media: {
            type: "webrtc",
            streamStore: writable(undefined),
            isBlocked: writable(false),
            setDimensions: vi.fn(),
        },
        volumeStore: undefined,
        hasVideo: writable(options.hasVideo ?? true),
        hasAudio: writable(true),
        isMuted: writable(false),
        statusStore: writable("connected"),
        name: writable("Alice"),
        showVoiceIndicator: writable(false),
        flipX: false,
        muteAudio: writable(false),
        displayMode: "cover",
        displayInPictureInPictureMode: true,
        usePresentationMode: false,
        spaceUserId: "user-1",
        closeStreamable: vi.fn(),
        canCloseStreamable: () => true,
        volume: writable(1),
        videoType: options.videoType ?? "video",
        webrtcStats: undefined,
    };
}
