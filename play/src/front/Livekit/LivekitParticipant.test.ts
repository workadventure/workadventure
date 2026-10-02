import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Subject } from "rxjs";
import { get, writable } from "svelte/store";
import { Track, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication } from "livekit-client";
import type { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import type { LivekitStreamable, Streamable } from "../Space/Streamable";
import { SCRIPTING_AUDIO_TRACK_NAME } from "./LivekitConstants";
import { LiveKitParticipant } from "./LivekitParticipant";

type MockRemoteTrackPublication = RemoteTrackPublication & {
    setSubscribed: ReturnType<typeof vi.fn<(subscribed: boolean) => void>>;
    setVideoQuality: ReturnType<typeof vi.fn>;
};

describe("LiveKitParticipant", () => {
    beforeEach(() => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        // Provide an empty capabilities object so hasCapability() does not crash
        window.capabilities = {};
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

    it("should merge microphone and scripting audio publications into the audio stream store", () => {
        const participant = createParticipant({ publications: [] });
        const media = participant.getStreamable().media as LivekitStreamable;
        const microphonePublication = createMicrophonePublication();
        const scriptingPublication = createScriptingAudioPublication();
        const microphoneStream = createAudioMediaStream("microphone");
        const scriptingStream = createAudioMediaStream("scripting");

        participant["handleTrackPublished"](microphonePublication);
        participant["handleTrackSubscribed"](createRemoteAudioTrack(microphoneStream), microphonePublication);
        participant["handleTrackPublished"](scriptingPublication);
        participant["handleTrackSubscribed"](createRemoteAudioTrack(scriptingStream), scriptingPublication);

        const audioStream = get(media.streamStore);

        expect(microphonePublication.setSubscribed).toHaveBeenCalledWith(true);
        expect(scriptingPublication.setSubscribed).toHaveBeenCalledWith(true);
        expect(audioStream).not.toBe(microphoneStream);
        expect(audioStream).not.toBe(scriptingStream);
        expect(audioStream?.getAudioTracks()).toEqual([
            microphoneStream.getAudioTracks()[0],
            scriptingStream.getAudioTracks()[0],
        ]);
        expect(get(participant.getStreamable().hasAudio)).toBe(true);
    });

    it("should expose scripting-only audio as streamable audio", () => {
        const participant = createParticipant({ publications: [] });
        const media = participant.getStreamable().media as LivekitStreamable;
        const scriptingPublication = createScriptingAudioPublication();
        const scriptingStream = createAudioMediaStream("scripting");

        participant["handleTrackPublished"](scriptingPublication);
        participant["handleTrackSubscribed"](createRemoteAudioTrack(scriptingStream), scriptingPublication);

        expect(scriptingPublication.setSubscribed).toHaveBeenCalledWith(true);
        expect(get(media.streamStore)).toBe(scriptingStream);
        expect(get(participant.getStreamable().hasAudio)).toBe(true);

        participant["handleTrackMuted"](scriptingPublication);
        expect(get(participant.getStreamable().hasAudio)).toBe(false);

        participant["handleTrackUnmuted"](scriptingPublication);
        expect(get(participant.getStreamable().hasAudio)).toBe(true);

        participant["handleTrackUnpublished"](scriptingPublication);
        expect(get(media.streamStore)).toBeUndefined();
        expect(get(participant.getStreamable().hasAudio)).toBe(false);
    });

    it("should restart scripting audio without dropping microphone audio", () => {
        const participant = createParticipant({ publications: [] });
        const media = participant.getStreamable().media as LivekitStreamable;
        const microphonePublication = createMicrophonePublication();
        const firstScriptingPublication = createScriptingAudioPublication();
        const secondScriptingPublication = createScriptingAudioPublication();
        const microphoneStream = createAudioMediaStream("microphone");
        const firstScriptingStream = createAudioMediaStream("scripting-1");
        const secondScriptingStream = createAudioMediaStream("scripting-2");

        participant["handleTrackPublished"](microphonePublication);
        participant["handleTrackSubscribed"](createRemoteAudioTrack(microphoneStream), microphonePublication);
        participant["handleTrackPublished"](firstScriptingPublication);
        participant["handleTrackSubscribed"](createRemoteAudioTrack(firstScriptingStream), firstScriptingPublication);
        participant["handleTrackPublished"](secondScriptingPublication);
        participant["handleTrackSubscribed"](createRemoteAudioTrack(secondScriptingStream), secondScriptingPublication);

        const audioStream = get(media.streamStore);

        expect(firstScriptingPublication.setSubscribed).toHaveBeenLastCalledWith(false);
        expect(audioStream?.getAudioTracks()).toEqual([
            microphoneStream.getAudioTracks()[0],
            secondScriptingStream.getAudioTracks()[0],
        ]);
        expect(get(participant.getStreamable().hasAudio)).toBe(true);
    });

    it("should ignore stale scripting audio events after scripting audio restarts", () => {
        const participant = createParticipant({ publications: [] });
        const media = participant.getStreamable().media as LivekitStreamable;
        const firstScriptingPublication = createScriptingAudioPublication();
        const secondScriptingPublication = createScriptingAudioPublication();
        const firstScriptingStream = createAudioMediaStream("scripting-1");
        const secondScriptingStream = createAudioMediaStream("scripting-2");
        const firstScriptingTrack = createRemoteAudioTrack(firstScriptingStream);

        participant["handleTrackPublished"](firstScriptingPublication);
        participant["handleTrackSubscribed"](firstScriptingTrack, firstScriptingPublication);
        participant["handleTrackPublished"](secondScriptingPublication);
        participant["handleTrackSubscribed"](createRemoteAudioTrack(secondScriptingStream), secondScriptingPublication);

        participant["handleTrackMuted"](firstScriptingPublication);
        participant["handleTrackUnsubscribed"](firstScriptingTrack, firstScriptingPublication);
        participant["handleTrackUnpublished"](firstScriptingPublication);

        expect(get(media.streamStore)).toBe(secondScriptingStream);
        expect(get(participant.getStreamable().hasAudio)).toBe(true);
    });

    it("should keep microphone audio when scripting audio is unpublished or unsubscribed", () => {
        const participant = createParticipant({ publications: [] });
        const media = participant.getStreamable().media as LivekitStreamable;
        const microphonePublication = createMicrophonePublication();
        const unpublishedScriptingPublication = createScriptingAudioPublication();
        const unsubscribedScriptingPublication = createScriptingAudioPublication();
        const microphoneStream = createAudioMediaStream("microphone");
        const unpublishedScriptingStream = createAudioMediaStream("scripting-unpublished");
        const unsubscribedScriptingStream = createAudioMediaStream("scripting-unsubscribed");

        participant["handleTrackPublished"](microphonePublication);
        participant["handleTrackSubscribed"](createRemoteAudioTrack(microphoneStream), microphonePublication);
        participant["handleTrackPublished"](unpublishedScriptingPublication);
        participant["handleTrackSubscribed"](
            createRemoteAudioTrack(unpublishedScriptingStream),
            unpublishedScriptingPublication,
        );

        participant["handleTrackUnpublished"](unpublishedScriptingPublication);

        expect(get(media.streamStore)).toBe(microphoneStream);
        expect(get(participant.getStreamable().hasAudio)).toBe(true);

        participant["handleTrackPublished"](unsubscribedScriptingPublication);
        const unsubscribedTrack = createRemoteAudioTrack(unsubscribedScriptingStream);
        participant["handleTrackSubscribed"](unsubscribedTrack, unsubscribedScriptingPublication);

        participant["handleTrackUnsubscribed"](unsubscribedTrack, unsubscribedScriptingPublication);

        expect(get(media.streamStore)).toBe(microphoneStream);
        expect(get(participant.getStreamable().hasAudio)).toBe(true);
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
        new AbortController().signal,
    );
}

function createCameraPublication(): MockRemoteTrackPublication {
    return {
        isLocal: false,
        isMuted: false,
        kind: Track.Kind.Video,
        source: Track.Source.Camera,
        trackName: "camera",
        track: undefined,
        setSubscribed: vi.fn(),
        setVideoQuality: vi.fn(),
    } as unknown as MockRemoteTrackPublication;
}

function createMicrophonePublication(): MockRemoteTrackPublication {
    return createAudioPublication(Track.Source.Microphone, "microphone");
}

function createScriptingAudioPublication(): MockRemoteTrackPublication {
    return createAudioPublication(Track.Source.Microphone, SCRIPTING_AUDIO_TRACK_NAME);
}

function createAudioPublication(source: Track.Source, trackName: string): MockRemoteTrackPublication {
    return {
        isLocal: false,
        isMuted: false,
        kind: Track.Kind.Audio,
        source,
        trackName,
        track: undefined,
        setSubscribed: vi.fn(),
        setVideoQuality: vi.fn(),
    } as unknown as MockRemoteTrackPublication;
}

function createRemoteAudioTrack(mediaStream: MediaStream): RemoteTrack {
    return {
        mediaStream,
    } as unknown as RemoteTrack;
}

function createAudioMediaStream(id: string): MediaStream {
    const track = new EventTarget() as MediaStreamTrack;
    Object.defineProperties(track, {
        id: { value: id },
        kind: { value: "audio" },
        readyState: { value: "live" },
        muted: { value: false },
        enabled: { value: true, writable: true },
    });

    return new MediaStream([track]);
}
