import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { ConnectionQuality, Track, type RemoteParticipant, type RemoteTrackPublication } from "livekit-client";
import type { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import type { LivekitStreamable, Streamable } from "../Space/Streamable";
import { LiveKitParticipant } from "./LivekitParticipant";

type MockRemoteTrackPublication = RemoteTrackPublication & {
    setSubscribed: ReturnType<typeof vi.fn<(subscribed: boolean) => void>>;
    setVideoQuality: ReturnType<typeof vi.fn>;
};

describe("LiveKitParticipant", () => {
    beforeEach(() => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("should keep the camera publication subscribed until the last lease is released", () => {
        vi.useFakeTimers();
        const publication = createCameraPublication();
        const participant = createParticipant({ publications: [publication] });
        const media = participant.getStreamable().media as LivekitStreamable;

        publication.setSubscribed.mockClear();

        const releaseFirst = media.acquireVideoSubscription();
        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);
        expect(publication.setSubscribed).toHaveBeenLastCalledWith(true);

        const releaseSecond = media.acquireVideoSubscription();
        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);

        releaseFirst();
        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);

        releaseSecond();
        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(75);

        expect(publication.setSubscribed).toHaveBeenCalledTimes(2);
        expect(publication.setSubscribed).toHaveBeenLastCalledWith(false);
    });

    it("should ignore duplicate lease releases", () => {
        vi.useFakeTimers();
        const publication = createCameraPublication();
        const participant = createParticipant({ publications: [publication] });
        const media = participant.getStreamable().media as LivekitStreamable;

        publication.setSubscribed.mockClear();

        const release = media.acquireVideoSubscription();
        release();
        release();

        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(75);

        expect(publication.setSubscribed).toHaveBeenCalledTimes(2);
        expect(publication.setSubscribed).toHaveBeenNthCalledWith(1, true);
        expect(publication.setSubscribed).toHaveBeenNthCalledWith(2, false);
    });

    it("should subscribe a newly published camera track when a lease is already active", () => {
        vi.useFakeTimers();
        const participant = createParticipant({ publications: [] });
        const media = participant.getStreamable().media as LivekitStreamable;
        const publication = createCameraPublication();

        const release = media.acquireVideoSubscription();

        participant["handleTrackPublished"](publication);

        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);
        expect(publication.setSubscribed).toHaveBeenCalledWith(true);

        release();
        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(75);

        expect(publication.setSubscribed).toHaveBeenCalledTimes(2);
        expect(publication.setSubscribed).toHaveBeenLastCalledWith(false);
    });

    it("should cancel a pending unsubscribe when the same video is reacquired quickly", () => {
        vi.useFakeTimers();
        const publication = createCameraPublication();
        const participant = createParticipant({ publications: [publication] });
        const media = participant.getStreamable().media as LivekitStreamable;

        publication.setSubscribed.mockClear();

        const releaseFirst = media.acquireVideoSubscription();
        releaseFirst();

        vi.advanceTimersByTime(50);
        const releaseSecond = media.acquireVideoSubscription();

        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);
        expect(publication.setSubscribed).toHaveBeenLastCalledWith(true);

        vi.advanceTimersByTime(100);
        expect(publication.setSubscribed).toHaveBeenCalledTimes(1);

        releaseSecond();
        vi.advanceTimersByTime(75);

        expect(publication.setSubscribed).toHaveBeenCalledTimes(2);
        expect(publication.setSubscribed).toHaveBeenLastCalledWith(false);
    });
});

function createParticipant({ publications }: { publications: RemoteTrackPublication[] }): LiveKitParticipant {
    const streamableSubjects: StreamableSubjects = {
        videoPeerAdded: new Subject<Streamable>(),
        videoPeerRemoved: new Subject<Streamable>(),
        screenSharingPeerAdded: new Subject<Streamable>(),
        screenSharingPeerRemoved: new Subject<Streamable>(),
    };

    const participant = {
        identity: "user-1",
        sid: "sid-1",
        isSpeaking: false,
        connectionQuality: ConnectionQuality.Excellent,
        name: "Alice",
        on: vi.fn(),
        off: vi.fn(),
        getTrackPublications: () => publications,
    } as unknown as RemoteParticipant;

    const spaceUser = {
        spaceUserId: "user-1",
        reactiveUser: {
            cameraState: writable(true),
            microphoneState: writable(true),
        },
    } as unknown as SpaceUserExtended;

    return new LiveKitParticipant(
        participant,
        spaceUser,
        { getName: () => "world.space", emitVideoQualityReport: vi.fn() } as unknown as SpaceInterface,
        "wss://livekit.example.com",
        streamableSubjects,
        writable(new Set<string>()),
        new AbortController().signal
    );
}

function createCameraPublication(): MockRemoteTrackPublication {
    return {
        isLocal: false,
        isMuted: false,
        source: Track.Source.Camera,
        track: undefined,
        setSubscribed: vi.fn(),
        setVideoQuality: vi.fn(),
    } as unknown as MockRemoteTrackPublication;
}
