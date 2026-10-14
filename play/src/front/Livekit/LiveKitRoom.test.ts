import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionState, DisconnectReason, Track } from "livekit-client";
import type * as LivekitClient from "livekit-client";
import type { Readable } from "svelte/store";
import type { LocalStreamStoreValue } from "../Stores/MediaStore";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { Streamable } from "../Space/Streamable";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { demotedCodecStore } from "../WebRtc/CodecPerformance";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { LiveKitRoom } from "./LiveKitRoom";
import { SCRIPTING_AUDIO_TRACK_NAME } from "./LivekitConstants";

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
        public isMuted = false;
        public unmute = vi.fn().mockResolvedValue(undefined);
        public resumeUpstream = vi.fn().mockResolvedValue(undefined);
        public pauseUpstream = vi.fn().mockResolvedValue(undefined);
        public replaceTrack = vi.fn().mockResolvedValue(undefined);
        public simulcastCodecs = new Map();
        constructor(public mediaStreamTrack: MediaStreamTrack) {}
    }
    return {
        ...actual,
        LocalVideoTrack: FakeLocalTrack,
        LocalAudioTrack: FakeLocalTrack,
        // Codec support is probed through RTCRtpSender, which jsdom does not have
        supportsAV1: () => false,
        supportsVP9: () => true,
        // As on Safari, where switching the audio output throws
        supportsAudioOutputSelection: () => false,
    };
});

describe("LiveKitRoom", () => {
    beforeEach(() => {
        // The encoder analytics hook checks the admin capabilities after a publication
        window.capabilities = {};
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("names each microphone publication to the back, but not the scripting audio", () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        const emitBackEvent = vi.fn();
        room["space"] = { emitBackEvent } as never;

        room["handleLocalTrackPublished"]({
            source: Track.Source.Microphone,
            trackName: "microphone",
            trackSid: "TR_microphone",
        } as never);
        room["handleLocalTrackPublished"]({
            source: Track.Source.Microphone,
            trackName: SCRIPTING_AUDIO_TRACK_NAME,
            trackSid: "TR_scripting",
        } as never);
        room["handleLocalTrackPublished"]({
            source: Track.Source.Camera,
            trackName: "camera",
            trackSid: "TR_camera",
        } as never);

        expect(emitBackEvent).toHaveBeenCalledOnce();
        expect(emitBackEvent).toHaveBeenCalledWith({
            event: {
                $case: "microphoneTrackPublishedMessage",
                microphoneTrackPublishedMessage: {
                    trackSid: "TR_microphone",
                    language: navigator.language,
                    noiseSuppression: expect.any(String),
                },
            },
        });
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

    it("should report a reconnection once, with the region it moved from", () => {
        const trackAdminEvent = vi.spyOn(analyticsClient, "trackAdminEvent");
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        const serverInfo = { region: "ojohannesburg1a" };
        room["room"] = { state: ConnectionState.Connected, engine: { latestJoinResponse: { serverInfo } } } as never;

        room["handleReconnecting"]("resume");
        // The resume failed: livekit-client rebuilds the connection, on a server of another region
        room["handleReconnecting"]("full");
        serverInfo.region = "osaudiarabia1a";
        room["handleReconnected"]();
        room["handleReconnected"]();

        expect(trackAdminEvent).toHaveBeenCalledOnce();
        expect(trackAdminEvent).toHaveBeenCalledWith("media.livekit.reconnected", {
            livekitServerUrl: "wss://livekit.example.com",
            livekitRegion: "osaudiarabia1a",
            previousLivekitRegion: "ojohannesburg1a",
            reconnectKind: "full",
            durationMs: expect.any(Number),
        });
    });

    // A camera that stops delivering frames (taken by another app, laptop waking up) stays "live" but muted.
    // livekit-client then pauses the upstream, which the room sees as a muted camera: the others get the avatar.
    // Resuming that upstream tells the room the camera is on again, so every tile mounted afterwards waits for
    // frames that never come and shows "No video stream received", while the user's own preview stays frozen.
    describe("with a camera that stopped delivering frames", () => {
        async function publishFrozenCamera(room: LiveKitRoom, cameraStream: LocalStreamStoreValue) {
            room["room"] = { state: ConnectionState.Connected } as never;
            room["localParticipant"] = { publishTrack: vi.fn().mockResolvedValue(undefined) } as never;
            await room["handleCameraTrack"](cameraStream);
            const cameraTrack = room["localCameraTrack"];
            if (!cameraTrack) {
                throw new Error("The camera was not published");
            }
            Object.assign(cameraTrack.mediaStreamTrack, { muted: true });
            Object.assign(cameraTrack, { isUpstreamPaused: true });
            return vi.spyOn(cameraTrack, "resumeUpstream");
        }

        it("should keep the upstream paused when the local stream is emitted again, e.g. on a microphone toggle", async () => {
            const room = createLiveKitRoom({
                screenSharingLocalStreamStore: writable(undefined),
                shouldPublishScreenShareStore: writable(false),
            });
            const cameraStream = createCameraStream();
            const resumeUpstream = await publishFrozenCamera(room, cameraStream);

            await room["handleCameraTrack"](cameraStream);

            expect(resumeUpstream).not.toHaveBeenCalled();
        });

        it("should keep the upstream paused when LiveKit reconnects", async () => {
            const room = createLiveKitRoom({
                screenSharingLocalStreamStore: writable(undefined),
                shouldPublishScreenShareStore: writable(false),
            });
            const cameraStream = createCameraStream();
            room["cameraStreamStore"] = writable(cameraStream);
            const resumeUpstream = await publishFrozenCamera(room, cameraStream);

            room["handleReconnected"]();
            await room["mediaTrackUpdateQueue"];

            expect(resumeUpstream).not.toHaveBeenCalled();
        });
    });

    it("should unmute the camera livekit-client muted when its track ended, once a new camera replaces it", async () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        room["room"] = { state: ConnectionState.Connected } as never;
        room["localParticipant"] = { publishTrack: vi.fn().mockResolvedValue(undefined) } as never;
        await room["handleCameraTrack"](createCameraStream());
        const cameraTrack = room["localCameraTrack"];
        if (!cameraTrack) {
            throw new Error("The camera was not published");
        }
        // The camera was unplugged: livekit-client muted it, which disables whatever track replaces it
        Object.assign(cameraTrack, { isMuted: true });
        const unmute = vi.spyOn(cameraTrack, "unmute");

        await room["handleCameraTrack"](createCameraStream("new-camera-track"));

        expect(unmute).toHaveBeenCalledOnce();
    });

    // The subscribers that cannot decode VP9 get the VP8 backup codec, which livekit-client sends from its own clone
    // of the camera track. Seen in production: they never got the camera back after it was turned off and on.
    it("should send the new camera to the subscribers of the backup codec after a camera off/on", async () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        room["room"] = { state: ConnectionState.Connected } as never;
        room["localParticipant"] = { publishTrack: vi.fn().mockResolvedValue(undefined) } as never;
        await room["handleCameraTrack"](createCameraStream());
        const cameraTrack = room["localCameraTrack"];
        if (!cameraTrack) {
            throw new Error("The camera was not published");
        }
        // A subscriber that cannot decode VP9 joined: livekit-client publishes VP8 from a clone of the camera
        const stopOldBackupTrack = vi.fn();
        const oldBackupTrack = Object.assign(createCameraTrack("camera-track-clone"), { stop: stopOldBackupTrack });
        const backupSender = { replaceTrack: vi.fn().mockResolvedValue(undefined) };
        cameraTrack.simulcastCodecs.set("vp8", {
            codec: "vp8",
            mediaStreamTrack: oldBackupTrack,
            sender: backupSender as unknown as RTCRtpSender,
        });

        await room["handleCameraTrack"](undefined);
        // A clone left running keeps the camera on
        expect(stopOldBackupTrack).toHaveBeenCalled();

        await room["handleCameraTrack"](createCameraStream("new-camera-track"));

        const backupTrack = cameraTrack.simulcastCodecs.get("vp8")?.mediaStreamTrack;
        expect(backupTrack?.id).toBe("new-camera-track-clone");
        expect(backupSender.replaceTrack).toHaveBeenLastCalledWith(backupTrack);
    });

    it("should clone the camera again for the backup codec when the space streams video again", async () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        room["room"] = { state: ConnectionState.Connected } as never;
        room["localParticipant"] = { publishTrack: vi.fn().mockResolvedValue(undefined) } as never;
        const cameraStream = createCameraStream();
        await room["handleCameraTrack"](cameraStream);
        const cameraTrack = room["localCameraTrack"];
        if (!cameraTrack) {
            throw new Error("The camera was not published");
        }
        const oldBackupTrack = createCameraTrack("camera-track-clone");
        const backupSender = { replaceTrack: vi.fn().mockResolvedValue(undefined) };
        cameraTrack.simulcastCodecs.set("vp8", {
            codec: "vp8",
            mediaStreamTrack: oldBackupTrack,
            sender: backupSender as unknown as RTCRtpSender,
        });

        // The space stops streaming video, the camera stays on
        await room["handleCameraTrack"](undefined);
        Object.assign(cameraTrack, { isUpstreamPaused: true });
        await room["handleCameraTrack"](cameraStream);

        const backupTrack = cameraTrack.simulcastCodecs.get("vp8")?.mediaStreamTrack;
        expect(backupTrack).not.toBe(oldBackupTrack);
        expect(backupSender.replaceTrack).toHaveBeenLastCalledWith(backupTrack);
    });

    it("should unmute the microphone livekit-client muted when its track ended, once a new microphone replaces it", async () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        room["room"] = { state: ConnectionState.Connected } as never;
        room["localParticipant"] = { publishTrack: vi.fn().mockResolvedValue(undefined) } as never;
        await room["handleMicrophoneTrack"](createMicrophoneStream());
        const microphoneTrack = room["localMicrophoneTrack"];
        if (!microphoneTrack) {
            throw new Error("The microphone was not published");
        }
        // The headset was unplugged: livekit-client muted the publication, the room hears nothing (PLAY-439)
        Object.assign(microphoneTrack, { isMuted: true });
        const unmute = vi.spyOn(microphoneTrack, "unmute");

        await room["handleMicrophoneTrack"](createMicrophoneStream("new-microphone-track"));

        expect(unmute).toHaveBeenCalledOnce();
    });

    it("should defer a scripting stream while the room is not connected and publish it once reconnected", async () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        const publishTrack = vi.fn().mockResolvedValue(undefined);
        const sdkRoom = { state: ConnectionState.Reconnecting };
        room["room"] = sdkRoom as never;
        room["localParticipant"] = { publishTrack } as never;
        const audioTrack = { id: "scripting-track", kind: "audio" } as unknown as MediaStreamTrack;
        const stream = { getAudioTracks: () => [audioTrack] } as unknown as MediaStream;

        await room.dispatchStream(stream);
        expect(publishTrack).not.toHaveBeenCalled();

        sdkRoom.state = ConnectionState.Connected;
        room["handleReconnected"]();
        await vi.waitFor(() => expect(publishTrack).toHaveBeenCalledOnce());
        expect(publishTrack).toHaveBeenCalledWith(audioTrack, expect.objectContaining({ name: expect.any(String) }));
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
            const trackAdminEvent = vi.spyOn(analyticsClient, "trackAdminEvent");
            const { room, decrement, emitBackEvent } = createDisconnectedRoom();

            room["handleDisconnected"](DisconnectReason.DUPLICATE_IDENTITY);

            expect(decrement).toHaveBeenCalledOnce();
            expect(emitBackEvent).not.toHaveBeenCalled();
            expect(trackAdminEvent).toHaveBeenCalledWith(
                "media.livekit.disconnected",
                expect.objectContaining({ disconnectReason: "DUPLICATE_IDENTITY", restart: false }),
            );
        });

        it("should report why and where the room was lost", () => {
            const trackAdminEvent = vi.spyOn(analyticsClient, "trackAdminEvent");
            const { room } = createDisconnectedRoom();
            room["room"] = {
                off: vi.fn(),
                disconnect: vi.fn().mockResolvedValue(undefined),
                engine: { latestJoinResponse: { serverInfo: { region: "ojohannesburg1a" } } },
            } as never;
            room["connectedAt"] = Date.now() - 90_000;
            room["handleReconnecting"]("resume");

            room["handleDisconnected"](DisconnectReason.SIGNAL_CLOSE);

            expect(trackAdminEvent).toHaveBeenCalledWith("media.livekit.disconnected", {
                livekitServerUrl: "wss://livekit.example.com",
                livekitRegion: "ojohannesburg1a",
                disconnectReason: "SIGNAL_CLOSE",
                connectedSeconds: 90,
                whileReconnecting: true,
                restart: true,
            });
        });

        it("should report a room that never connected", () => {
            const trackAdminEvent = vi.spyOn(analyticsClient, "trackAdminEvent");
            const { room } = createDisconnectedRoom();
            room["everConnected"] = false;

            room["handleDisconnected"](undefined);

            expect(trackAdminEvent).toHaveBeenCalledWith(
                "media.livekit.disconnected",
                expect.objectContaining({ disconnectReason: "UNKNOWN", livekitRegion: null, connectedSeconds: null }),
            );
        });

        it("should do nothing when the client initiated the disconnection", () => {
            const trackAdminEvent = vi.spyOn(analyticsClient, "trackAdminEvent");
            const { room, decrement, emitBackEvent } = createDisconnectedRoom();

            room["handleDisconnected"](DisconnectReason.CLIENT_INITIATED);

            expect(decrement).not.toHaveBeenCalled();
            expect(emitBackEvent).not.toHaveBeenCalled();
            expect(trackAdminEvent).not.toHaveBeenCalled();
        });

        it("should only destroy the room once", () => {
            const { room, decrement } = createDisconnectedRoom();

            room["handleDisconnected"](undefined);
            room.destroy();

            expect(decrement).toHaveBeenCalledOnce();
        });
    });

    it("should not ask livekit-client to switch the audio output where it cannot", () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
            speakerDeviceIdStore: writable("airpods"),
        });
        const switchActiveDevice = vi.fn().mockRejectedValue(new Error("cannot switch audio output"));
        room["room"] = { switchActiveDevice } as never;

        room["synchronizeMediaState"]();

        expect(switchActiveDevice).not.toHaveBeenCalled();
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

    it("should remove a remote participant that left after a full reconnection", () => {
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        const spaceUser = {
            spaceUserId: "alice-space-user",
            reactiveUser: { cameraState: writable(true), microphoneState: writable(true) },
        };
        Object.assign(room["space"], {
            mySpaceUserId: "me",
            getSpaceUserBySpaceUserId: (id: string) => (id === spaceUser.spaceUserId ? spaceUser : undefined),
        });
        const participant = {
            identity: "alice",
            sid: "PA_before",
            metadata: JSON.stringify({ userId: spaceUser.spaceUserId }),
            isSpeaking: false,
            name: "Alice",
            on: vi.fn(),
            off: vi.fn(),
            getTrackPublications: () => [],
        };
        const removed: Streamable[] = [];
        const subscription = room["_streamableSubjects"].videoPeerRemoved.subscribe((streamable) =>
            removed.push(streamable),
        );

        room["handleParticipantConnected"](participant as never);
        // livekit-client keeps the same RemoteParticipant across a full reconnection and updates its sid in place
        participant.sid = "PA_after";
        room["handleParticipantDisconnected"](participant as never);
        subscription.unsubscribe();

        expect(removed.map((streamable) => streamable.spaceUserId)).toEqual([spaceUser.spaceUserId]);
        expect(participant.off).toHaveBeenCalled();
    });
});

describe("codec demotion", () => {
    beforeEach(() => {
        window.capabilities = {};
        demotedCodecStore.video.set(undefined);
        demotedCodecStore.screenSharing.set(undefined);
    });

    it("republishes the screen share without the demoted codec", async () => {
        const stream = createScreenShareStreamWithVideo();
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(stream),
            shouldPublishScreenShareStore: writable(true),
        });
        const publishTrack = vi.fn().mockResolvedValue(undefined);
        const unpublishTrack = vi.fn().mockResolvedValue(undefined);
        room["room"] = { state: ConnectionState.Connected } as never;
        room["localParticipant"] = { publishTrack, unpublishTrack } as never;
        room["screenShareStreamStore"] = writable(stream);
        await room["handleScreenShareUpdate"](stream);
        expect(publishTrack.mock.calls[0][1].videoCodec).toBe("vp9");

        demotedCodecStore.screenSharing.set("vp9");
        room["republishScreenShare"]();
        await room["screenShareUpdateQueue"];

        expect(unpublishTrack).toHaveBeenCalledOnce();
        expect(publishTrack).toHaveBeenCalledTimes(2);
        expect(publishTrack.mock.calls[1][1].videoCodec).toBe("h264");
    });

    it("unpublishes the camera for real, once, to publish it again without the demoted codec", async () => {
        const cameraStream = createCameraStream();
        const room = createLiveKitRoom({
            screenSharingLocalStreamStore: writable(undefined),
            shouldPublishScreenShareStore: writable(false),
        });
        const publishTrack = vi.fn().mockResolvedValue(undefined);
        const unpublishTrack = vi.fn().mockResolvedValue(undefined);
        room["room"] = { state: ConnectionState.Connected } as never;
        room["localParticipant"] = { publishTrack, unpublishTrack } as never;
        room["cameraStreamStore"] = writable(cameraStream);
        await room["handleCameraTrack"](cameraStream);
        expect(publishTrack.mock.calls[0][1].videoCodec).toBe("vp9");

        demotedCodecStore.video.set("vp9");
        room["republishCamera"]();
        await room["mediaTrackUpdateQueue"];

        expect(unpublishTrack).toHaveBeenCalledOnce();
        expect(publishTrack).toHaveBeenCalledTimes(2);
        expect(publishTrack.mock.calls[1][1].videoCodec).toBe("h264");

        // An OpenH264 that cannot keep up either: VP8, the floor on LiveKit
        demotedCodecStore.video.set("h264");
        room["republishCamera"]();
        await room["mediaTrackUpdateQueue"];
        expect(unpublishTrack).toHaveBeenCalledTimes(2);
        expect(publishTrack.mock.calls[2][1].videoCodec).toBe("vp8");

        // Turning the camera off afterwards pauses the publication, as before
        await room["handleCameraTrack"](undefined);
        expect(unpublishTrack).toHaveBeenCalledTimes(2);
        const cameraTrack = room["localCameraTrack"] as unknown as { pauseUpstream: ReturnType<typeof vi.fn> };
        expect(cameraTrack.pauseUpstream.mock.calls).toHaveLength(1);
    });
});

function createScreenShareStreamWithVideo(): LocalStreamStoreValue {
    const track = {
        id: "screen-track",
        kind: "video",
        getSettings: () => ({ width: 1920, height: 1080 }),
    } as unknown as MediaStreamTrack;
    return {
        type: "success",
        stream: { getVideoTracks: () => [track], getAudioTracks: () => [] } as unknown as MediaStream,
    };
}

function createLiveKitRoom({
    screenSharingLocalStreamStore,
    shouldPublishScreenShareStore,
    livekitRoomCounter = { increment: vi.fn(), decrement: vi.fn() },
    emitBackEvent = vi.fn(),
    speakerDeviceIdStore = writable(undefined),
}: {
    screenSharingLocalStreamStore: Readable<LocalStreamStoreValue | undefined>;
    shouldPublishScreenShareStore: Readable<boolean>;
    speakerDeviceIdStore?: Readable<string | undefined>;
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
        speakerDeviceIdStore,
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
        getName: () => "world.space",
        emitVideoQualityReport: vi.fn(),
    } as unknown as SpaceInterface;
}

function createCameraStream(id = "camera-track"): LocalStreamStoreValue {
    const track = createCameraTrack(id);
    return {
        type: "success",
        stream: { getVideoTracks: () => [track], getAudioTracks: () => [] } as unknown as MediaStream,
    };
}

function createCameraTrack(id: string): MediaStreamTrack {
    return {
        id,
        kind: "video",
        getSettings: () => ({ width: 1280, height: 720 }),
        clone: vi.fn(() => createCameraTrack(`${id}-clone`)),
        stop: vi.fn(),
    } as unknown as MediaStreamTrack;
}

function createMicrophoneStream(id = "microphone-track"): LocalStreamStoreValue {
    const track = { id, kind: "audio" } as unknown as MediaStreamTrack;
    return {
        type: "success",
        stream: { getVideoTracks: () => [], getAudioTracks: () => [track] } as unknown as MediaStream,
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
