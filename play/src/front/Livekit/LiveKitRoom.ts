import { z } from "zod";
import { MapStore } from "@workadventure/store-utils";
import type { LocalParticipant, Participant, RemoteParticipant, TrackPublishOptions } from "livekit-client";
import {
    BackupCodecPolicy,
    LocalAudioTrack,
    LocalVideoTrack,
    Room,
    RoomEvent,
    Track,
    VideoPresets,
    DisconnectReason,
    ConnectionState,
    supportsAV1,
} from "livekit-client";
import type { Readable, Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import type { LocalStreamStoreValue } from "../Stores/MediaStore";
import { localStreamStoreForPublishing, speakerSelectedStore, videoQualityStore } from "../Stores/MediaStore";
import { screenShareQualityStore } from "../Stores/ScreenSharingStore";
import { bandwidthConstrainedPreferenceStore } from "../Stores/BandwidthConstrainedPreferenceStore";
import type { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { decrementLivekitRoomCount, incrementLivekitRoomCount } from "../Utils/E2EHooks";
import { triggerReorderStore } from "../Stores/OrderedStreamableCollectionStore";
import { deriveSwitchStore } from "../Stores/InterruptorStore";
import { selectVideoPreset, type VideoQualitySetting } from "../WebRtc/VideoPresets";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { LIVEKIT_PIXEL_DENSITY } from "../Enum/EnvironmentVariable";
import { SCREEN_SHARE_STARTING_PRIORITY, VIDEO_STARTING_PRIORITY } from "../Space/VideoBoxPriorities";
import { audioPlaybackStore } from "../Stores/AudioPlaybackStore";
import { SCRIPTING_AUDIO_TRACK_NAME } from "./LivekitConstants";
import { LiveKitParticipant } from "./LivekitParticipant";
import type { LiveKitRoomInterface } from "./LiveKitRoomInterface";

const ParticipantMetadataSchema = z.object({
    userId: z.string(),
});

type ParticipantMetadata = z.infer<typeof ParticipantMetadataSchema>;

type LivekitRoomCounter = {
    increment: () => void;
    decrement: () => void;
};

// ponytail: fixed delay before asking for a new invitation when the room never managed to connect (the LiveKit
// server is unreachable right now), so a long outage does not turn into a tight re-invitation loop. Exponential
// backoff if it ever matters.
const RESTART_DELAY_WHEN_NEVER_CONNECTED_MS = 5000;

export class LiveKitRoom implements LiveKitRoomInterface {
    private room: Room | undefined;
    private participants: MapStore<string, LiveKitParticipant> = new MapStore<string, LiveKitParticipant>();
    // Stores LiveKit participants that connected before their corresponding spaceUser was available
    private pendingParticipants: Map<string, RemoteParticipant> = new Map();
    private localParticipant: LocalParticipant | undefined;
    private scriptingAudioTrack: MediaStreamTrack | undefined;
    // Scripting stream received while the room was not connected, published once it is (see dispatchStream)
    private pendingScriptingStream: MediaStream | undefined;
    private localScreenSharingVideoTrack: LocalVideoTrack | undefined;
    private localScreenSharingAudioTrack: LocalAudioTrack | undefined;
    private localCameraTrack: LocalVideoTrack | undefined;
    private localMicrophoneTrack: LocalAudioTrack | undefined;
    private screenShareUpdateQueue: Promise<void> = Promise.resolve();
    private mediaTrackUpdateQueue: Promise<void> = Promise.resolve();
    private audioOutputUpdateQueue: Promise<void> = Promise.resolve();
    private unsubscribers: Unsubscriber[] = [];
    private rxjsSubscriptions: Subscription[] = [];
    private unregisterAudioPlaybackRetry: Unsubscriber | undefined;
    private destroyed = false;
    private everConnected = false;
    // Kept so that publications skipped while the room was reconnecting can be replayed on RoomEvent.Reconnected
    private cameraStreamStore: Readable<LocalStreamStoreValue | undefined> | undefined;
    private microphoneStreamStore: Readable<LocalStreamStoreValue | undefined> | undefined;
    private screenShareStreamStore: Readable<LocalStreamStoreValue | undefined> | undefined;

    // Bound event handlers to avoid memory leaks
    private readonly boundHandleParticipantConnected = this.handleParticipantConnected.bind(this);
    private readonly boundHandleParticipantDisconnected = this.handleParticipantDisconnected.bind(this);
    private readonly boundHandleActiveSpeakersChanged = this.handleActiveSpeakersChanged.bind(this);
    private readonly boundHandleDisconnected = this.handleDisconnected.bind(this);
    private readonly boundHandleReconnected = this.handleReconnected.bind(this);
    private readonly boundHandleAudioPlaybackStatusChanged = this.handleAudioPlaybackStatusChanged.bind(this);

    constructor(
        private serverUrl: string,
        private token: string,
        private space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private abortSignal: AbortSignal,
        private screenSharingLocalStreamStore: Readable<LocalStreamStoreValue | undefined>,
        private speakerDeviceIdStore: Readable<string | undefined> = speakerSelectedStore,
        private _livekitRoomCounter: LivekitRoomCounter = {
            increment: incrementLivekitRoomCount,
            decrement: decrementLivekitRoomCount,
        },
        private _localStreamStore: Readable<LocalStreamStoreValue> = localStreamStoreForPublishing,
    ) {
        this._livekitRoomCounter.increment();
    }

    public async prepareConnection(): Promise<Room> {
        this.room = new Room({
            adaptiveStream: {
                pauseVideoInBackground: true,
                pixelDensity: LIVEKIT_PIXEL_DENSITY,
            },
            dynacast: true,
            publishDefaults: {
                // Commented out: the default simulcast layers are sufficient for our use case
                // videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
                videoCodec: "vp9",
                // If a user does not support VP9 or AV1, do not downgrade everyone to VP8.
                // Instead, let the publisher publish both VP9 and VP8 tracks using simulcast.
                // Viewers will see the best possible codec they support.
                backupCodecPolicy: BackupCodecPolicy.SIMULCAST,
                backupCodec: {
                    codec: "vp8",
                },
            },
            videoCaptureDefaults: {
                resolution: VideoPresets.h720,
            },
            stopLocalTrackOnUnpublish: false,
        });

        // Each track will subscribe to the room events like cleanup, so we want to be ready for a lot of listeners
        this.room.setMaxListeners(10000);

        this.localParticipant = this.room.localParticipant;

        await this.room.prepareConnection(this.serverUrl, this.token);

        return this.room;
    }

    private joinRoomCalled = false;

    public async joinRoom() {
        if (this.joinRoomCalled) {
            return;
        }
        if (this.abortSignal.aborted) {
            return;
        }
        this.joinRoomCalled = true;

        const room = this.room ?? (await this.prepareConnection());

        this.handleRoomEvents();
        await room.connect(this.serverUrl, this.token, {
            autoSubscribe: false,
        });
        this.everConnected = true;
        this.handleAudioPlaybackStatusChanged();
        if (this.abortSignal.aborted) {
            await room.disconnect();
            return;
        }

        this.synchronizeMediaState();
        this.flushPendingScriptingStream();

        // Subscribe to observeUserJoined to process pending participants when a specific spaceUser becomes available
        this.rxjsSubscriptions.push(
            this.space.observeUserJoined.subscribe((spaceUser) => {
                this.processPendingParticipantForUser(spaceUser);
            }),
        );

        // Process existing remote participants
        Array.from(room.remoteParticipants.values()).forEach((participant) => {
            const id = this.getParticipantId(participant);
            if (!participant.permissions?.canPublish) {
                console.info("participant has no publish permission", id);
                return;
            }

            const spaceUser = this.space.getSpaceUserBySpaceUserId(id);
            if (!spaceUser) {
                // Store the participant to process later when the spaceUser becomes available.
                // This handles the race condition where LiveKit participants may connect
                // before their corresponding SpaceUser message arrives from the backend.
                this.pendingParticipants.set(id, participant);
                return;
            }

            if (spaceUser.spaceUserId === this.space.mySpaceUserId) {
                return;
            }

            this.createLiveKitParticipant(participant, spaceUser);
        });
    }

    private getQualitySetting(isScreenShare: boolean): VideoQualitySetting {
        return isScreenShare ? get(screenShareQualityStore) : get(videoQualityStore);
    }

    private getBandwidthConstrainedPreference(): RTCDegradationPreference {
        return get(bandwidthConstrainedPreferenceStore);
    }

    private getPresetForTrack(track: MediaStreamTrack, isScreenShare: boolean): { bitrate: number; fps: number } {
        const settings = track.getSettings();
        const width = settings.width || 1280;
        const height = settings.height || 720;
        return selectVideoPreset(height, width, isScreenShare, this.getQualitySetting(isScreenShare));
    }

    /**
     * Serialized like the track updates below. The selection can emit twice in a row — the fallback
     * to a default speaker followed by the restore of the persisted preference on the next
     * `devicechange` — and two overlapping `switchActiveDevice` calls can settle out of order,
     * leaving the room on the device the user did not pick.
     *
     * An empty string is a meaningful value here: it means "system default".
     */
    private queueAudioOutputUpdate(deviceId: string): void {
        this.audioOutputUpdateQueue = this.audioOutputUpdateQueue
            .then(() => this.room?.switchActiveDevice("audiooutput", deviceId))
            .then(() => undefined)
            .catch((err) => {
                console.error("An error occurred while switching active device", err);
                Sentry.captureException(err);
            });
    }

    private queueCameraTrackUpdate(localStream: LocalStreamStoreValue | undefined): void {
        this.mediaTrackUpdateQueue = this.mediaTrackUpdateQueue
            .then(() => this.handleCameraTrack(localStream))
            .catch((err) => {
                console.error("An error occurred while handling a camera update", err);
                Sentry.captureException(err);
            });
    }

    private async handleCameraTrack(localStream: LocalStreamStoreValue | undefined): Promise<void> {
        if (localStream === undefined || localStream.type !== "success" || !localStream.stream) {
            await this.unpublishCameraTrack();
            return;
        }

        const videoTrack = localStream.stream.getVideoTracks()[0];

        if (!videoTrack) {
            await this.unpublishCameraTrack();
            return;
        }

        // Are we trying to publish the same track again?
        // Note: in practice, we never reach this point with the same track, because we get a new track
        // each time we stop and restart the camera.
        if (this.localCameraTrack && this.localCameraTrack.mediaStreamTrack.id === videoTrack.id) {
            if (this.localCameraTrack.isUpstreamPaused) {
                await this.localCameraTrack.resumeUpstream();
            }
            return;
        }

        if (!this.localParticipant) {
            throw new Error("Local participant not found");
        }

        if (!this.localCameraTrack) {
            if (!this.isRoomConnected()) {
                // Skipped on purpose: see isRoomConnected(). handleReconnected() replays this update.
                return;
            }
            const cameraTrack = new LocalVideoTrack(videoTrack);
            const publishOptions: TrackPublishOptions = {
                source: Track.Source.Camera,
                videoCodec: "vp9",
                simulcast: true,
                // Commented out: the default simulcast layers are sufficient for our use case
                //videoSimulcastLayers: [VideoPresets.h1080, VideoPresets.h360, VideoPresets.h216,  ],
            };

            const preset = this.getPresetForTrack(videoTrack, false);
            publishOptions.videoEncoding = {
                maxBitrate: preset.bitrate,
                maxFramerate: preset.fps,
            };

            await this.localParticipant.publishTrack(cameraTrack, publishOptions);
            // Only keep the reference once published: after a failed publish, later updates must publish again
            // instead of calling replaceTrack() on an unpublished track.
            this.localCameraTrack = cameraTrack;
        } else {
            await this.localCameraTrack.replaceTrack(videoTrack, {
                userProvidedTrack: true,
            });

            if (this.localCameraTrack.isUpstreamPaused) {
                await this.localCameraTrack.resumeUpstream();
            }
        }
    }

    private queueMicrophoneTrackUpdate(localStream: LocalStreamStoreValue | undefined): void {
        this.mediaTrackUpdateQueue = this.mediaTrackUpdateQueue
            .then(() => this.handleMicrophoneTrack(localStream))
            .catch((err) => {
                console.error("An error occurred while handling a microphone update", err);
                Sentry.captureException(err);
            });
    }

    private async handleMicrophoneTrack(localStream: LocalStreamStoreValue | undefined): Promise<void> {
        if (localStream === undefined || localStream.type !== "success" || !localStream.stream) {
            await this.unpublishMicrophoneTrack();
            return;
        }

        const audioTrack = localStream.stream.getAudioTracks()[0];

        if (!audioTrack) {
            await this.unpublishMicrophoneTrack();
            return;
        }

        // Are we trying to publish the same track again?
        // Note: in practice, we never reach this point with the same track, because we get a new track
        // each time we stop and restart the microphone.
        if (this.localMicrophoneTrack && this.localMicrophoneTrack.mediaStreamTrack.id === audioTrack.id) {
            if (this.localMicrophoneTrack.isUpstreamPaused) {
                await this.localMicrophoneTrack.resumeUpstream();
            }
            return;
        }

        if (!this.localParticipant) {
            throw new Error("Local participant not found");
        }

        if (!this.localMicrophoneTrack) {
            if (!this.isRoomConnected()) {
                // Skipped on purpose: see isRoomConnected(). handleReconnected() replays this update.
                return;
            }
            const microphoneTrack = new LocalAudioTrack(audioTrack);

            await this.localParticipant.publishTrack(microphoneTrack, {
                source: Track.Source.Microphone,
            });
            // Only keep the reference once published (see handleCameraTrack)
            this.localMicrophoneTrack = microphoneTrack;
        } else {
            await this.localMicrophoneTrack.replaceTrack(audioTrack, {
                userProvidedTrack: true,
            });

            if (this.localMicrophoneTrack.isUpstreamPaused) {
                await this.localMicrophoneTrack.resumeUpstream();
            }
        }
    }

    /**
     * publishTrack() on a room whose signal connection is down waits up to 15 seconds for it to come back, then
     * rejects AND stops the MediaStreamTrack we handed it, killing the user's own camera/microphone.
     * Publications are therefore skipped while the room is not connected and replayed by handleReconnected().
     */
    private isRoomConnected(): boolean {
        return this.room?.state === ConnectionState.Connected;
    }

    private handleReconnected() {
        // Handlers are no-ops for tracks that are already published, so replaying the whole media state is safe.
        if (this.cameraStreamStore) {
            this.queueCameraTrackUpdate(get(this.cameraStreamStore));
        }
        if (this.microphoneStreamStore) {
            this.queueMicrophoneTrackUpdate(get(this.microphoneStreamStore));
        }
        if (this.screenShareStreamStore) {
            this.queueScreenShareUpdate(get(this.screenShareStreamStore));
        }
        this.flushPendingScriptingStream();
    }

    private flushPendingScriptingStream() {
        const stream = this.pendingScriptingStream;
        if (!stream) {
            return;
        }
        this.pendingScriptingStream = undefined;
        this.dispatchStream(stream).catch((err) => {
            console.error("An error occurred while publishing the pending scripting stream", err);
            Sentry.captureException(err);
        });
    }

    private synchronizeMediaState() {
        this.cameraStreamStore = deriveSwitchStore(this._localStreamStore, this.space.isStreamingVideoStore);
        this.unsubscribers.push(
            this.cameraStreamStore.subscribe((localStream) => {
                this.queueCameraTrackUpdate(localStream);
            }),
        );

        this.microphoneStreamStore = deriveSwitchStore(this._localStreamStore, this.space.isStreamingAudioStore);
        this.unsubscribers.push(
            this.microphoneStreamStore.subscribe((localStream) => {
                this.queueMicrophoneTrackUpdate(localStream);
            }),
        );

        this.screenShareStreamStore = deriveSwitchStore(
            this.screenSharingLocalStreamStore,
            this.space.shouldPublishScreenShareStore,
        );
        this.unsubscribers.push(
            this.screenShareStreamStore.subscribe((stream) => {
                this.queueScreenShareUpdate(stream);
            }),
        );

        this.unsubscribers.push(
            this.speakerDeviceIdStore.subscribe((deviceId) => {
                if (deviceId === undefined) return;

                this.queueAudioOutputUpdate(deviceId);
            }),
        );

        this.unsubscribers.push(
            bandwidthConstrainedPreferenceStore.subscribe((preference) => {
                if (!this.localScreenSharingVideoTrack) {
                    return;
                }
                this.localScreenSharingVideoTrack.setDegradationPreference(preference).catch((err) => {
                    console.error("An error occurred while setting degradation preference", err);
                    Sentry.captureException(err);
                });
            }),
        );
    }

    private queueScreenShareUpdate(stream: LocalStreamStoreValue | undefined): void {
        this.screenShareUpdateQueue = this.screenShareUpdateQueue
            .then(() => this.handleScreenShareUpdate(stream))
            .catch((err) => {
                console.error("An error occurred while handling a screen share update", err);
                Sentry.captureException(err);
            });
    }

    private async handleScreenShareUpdate(stream: LocalStreamStoreValue | undefined): Promise<void> {
        const streamResult = stream?.type === "success" ? stream.stream : undefined;

        if (!this.localParticipant) {
            console.error("Local participant not found");
            Sentry.captureException(new Error("Local participant not found"));
            return;
        }

        if (!streamResult) {
            if (this.localScreenSharingVideoTrack || this.localScreenSharingAudioTrack) {
                await this.unpublishAllScreenShareTrack();
            }
            return;
        }

        const screenShareVideoTrack = streamResult.getVideoTracks()[0];
        const screenShareAudioTrack = streamResult.getAudioTracks()[0];

        if (!screenShareVideoTrack) {
            return;
        }

        if (!this.localScreenSharingVideoTrack) {
            if (!this.isRoomConnected()) {
                // Skipped on purpose: see isRoomConnected(). handleReconnected() replays this update.
                return;
            }
            const screenShareVideoLocalTrack = new LocalVideoTrack(screenShareVideoTrack);

            const screenSharePublishOptions: TrackPublishOptions = {
                source: Track.Source.ScreenShare,
                // When AV1 encoding is unavailable (Chrome on Android, Chromium builds without
                // libaom, Firefox, Safari...), LiveKit silently rewrites the codec to its hardcoded
                // default of VP8 rather than to `publishDefaults.videoCodec`. Fall back to VP9
                // explicitly; LiveKit still degrades VP9 to VP8 on its own if VP9 is missing too.
                videoCodec: supportsAV1() ? "av1" : "vp9",
                simulcast: true,
                // Commented out: the default simulcast layers are sufficient for our use case
                // screenShareSimulcastLayers: [ScreenSharePresets.h720fps30]
                degradationPreference: this.getBandwidthConstrainedPreference(),
            };

            const preset = this.getPresetForTrack(screenShareVideoTrack, true);
            screenSharePublishOptions.screenShareEncoding = {
                maxBitrate: preset.bitrate,
                maxFramerate: preset.fps,
            };

            await this.localParticipant.publishTrack(screenShareVideoLocalTrack, screenSharePublishOptions);
            // Only keep the reference once published (see handleCameraTrack)
            this.localScreenSharingVideoTrack = screenShareVideoLocalTrack;
        } else if (this.localScreenSharingVideoTrack.mediaStreamTrack.id === screenShareVideoTrack.id) {
            // Note: this cannot really happen as we never pause the upstream. We unpublish the track instead.
            if (this.localScreenSharingVideoTrack.isUpstreamPaused) {
                await this.localScreenSharingVideoTrack.resumeUpstream();
            }
        } else {
            await this.localScreenSharingVideoTrack.replaceTrack(screenShareVideoTrack, {
                userProvidedTrack: true,
            });

            if (this.localScreenSharingVideoTrack.isUpstreamPaused) {
                await this.localScreenSharingVideoTrack.resumeUpstream();
            }
        }

        if (screenShareAudioTrack) {
            if (!this.localScreenSharingAudioTrack) {
                if (!this.isRoomConnected()) {
                    return;
                }
                const screenShareAudioLocalTrack = new LocalAudioTrack(screenShareAudioTrack);

                await this.localParticipant.publishTrack(screenShareAudioLocalTrack, {
                    source: Track.Source.ScreenShareAudio,
                });
                // Only keep the reference once published (see handleCameraTrack)
                this.localScreenSharingAudioTrack = screenShareAudioLocalTrack;
            } else if (this.localScreenSharingAudioTrack.mediaStreamTrack.id === screenShareAudioTrack.id) {
                // Note: this cannot really happen as we never pause the upstream. We unpublish the track instead.
                if (this.localScreenSharingAudioTrack.isUpstreamPaused) {
                    await this.localScreenSharingAudioTrack.resumeUpstream();
                }
            } else {
                await this.localScreenSharingAudioTrack.replaceTrack(screenShareAudioTrack, {
                    userProvidedTrack: true,
                });

                if (this.localScreenSharingAudioTrack.isUpstreamPaused) {
                    await this.localScreenSharingAudioTrack.resumeUpstream();
                }
            }
        } else if (this.localScreenSharingAudioTrack && !this.localScreenSharingAudioTrack.isUpstreamPaused) {
            await this.localScreenSharingAudioTrack.pauseUpstream();
        }
    }

    private async unpublishAllScreenShareTrack() {
        if (!this.localParticipant) {
            console.error("Local participant not found");
            Sentry.captureException(new Error("Local participant not found"));
            return;
        }

        const localParticipant = this.localParticipant;

        // Unpublish both video and audio screen share tracks
        await Promise.all([
            (async (): Promise<void> => {
                if (this.localScreenSharingVideoTrack) {
                    // Note: for some reason, unpublishing / publishing a new track causes memory leaks.
                    await localParticipant.unpublishTrack(this.localScreenSharingVideoTrack, false);
                    // We previously tried to just pause the upstream and "replaceTrack" when publishing a new one,
                    // but this is causing issues with the egress CompositeRoom (that shows black boxes for paused streams)
                    // await this.localScreenSharingVideoTrack.pauseUpstream();
                }
            })(),
            (async (): Promise<void> => {
                if (this.localScreenSharingAudioTrack) {
                    // Note: for some reason, unpublishing / publishing a new track causes memory leaks.
                    await localParticipant.unpublishTrack(this.localScreenSharingAudioTrack, false);
                    // We previously tried to just pause the upstream and "replaceTrack" when publishing a new one,
                    // but this is causing issues with the egress CompositeRoom (that shows black boxes for paused streams)
                    // await this.localScreenSharingAudioTrack.pauseUpstream();
                }
            })(),
        ]);

        // Note: if we ever use "pauseUpstream" again instead of unpublishTrack, we should comment the clear of local track references
        // because of the memory leak issue mentioned above. We need to keep them to be able to replace the tracks when publishing a new screen share.
        this.localScreenSharingVideoTrack = undefined;
        this.localScreenSharingAudioTrack = undefined;
    }

    /**
     * Unpublishes the current microphone track
     */
    private async unpublishMicrophoneTrack(): Promise<void> {
        if (!this.localParticipant) {
            return;
        }

        if (this.localMicrophoneTrack) {
            await this.localMicrophoneTrack.pauseUpstream();
            // Note: for some reason, unpublishing / publishing a new track causes memory leaks.
            // Instead, we just pause the upstream of the track when unpublishing, and "replaceTrack" when publishing a new one.
            // await this.localParticipant.unpublishTrack(this.localMicrophoneTrack, false);
            // this.localMicrophoneTrack = undefined;
        }
    }

    /**
     * Unpublishes the current camera track
     */
    private async unpublishCameraTrack(): Promise<void> {
        if (!this.localParticipant) {
            return;
        }

        if (this.localCameraTrack) {
            await this.localCameraTrack.pauseUpstream();
            // Note: for some reason, unpublishing / publishing a new track causes memory leaks.
            // Instead, we just pause the upstream of the track when unpublishing, and "replaceTrack" when publishing a new one.
            // await this.localParticipant?.unpublishTrack(this.localCameraTrack, false);
            // this.localCameraTrack = undefined;
        }
    }

    private handleRoomEvents() {
        if (!this.room) {
            console.error("Room not found");
            Sentry.captureException(new Error("Room not found"));
            return;
        }

        this.room.on(RoomEvent.ParticipantConnected, this.boundHandleParticipantConnected);
        this.room.on(RoomEvent.ParticipantDisconnected, this.boundHandleParticipantDisconnected);
        this.room.on(RoomEvent.ActiveSpeakersChanged, this.boundHandleActiveSpeakersChanged);
        this.room.on(RoomEvent.Disconnected, this.boundHandleDisconnected);
        this.room.on(RoomEvent.Reconnected, this.boundHandleReconnected);
        this.room.on(RoomEvent.AudioPlaybackStatusChanged, this.boundHandleAudioPlaybackStatusChanged);
    }

    private handleAudioPlaybackStatusChanged() {
        if (!this.room) {
            return;
        }

        if (this.room.canPlaybackAudio) {
            this.unregisterAudioPlaybackRetry?.();
            this.unregisterAudioPlaybackRetry = undefined;
            return;
        }

        this.unregisterAudioPlaybackRetry ??= audioPlaybackStore.register(() => this.room?.startAudio());
    }

    private getDisconnectReasonLabel(reason?: DisconnectReason): string {
        if (reason === undefined) {
            return "UNKNOWN";
        }
        return DisconnectReason[reason] ?? `UNKNOWN(${reason})`;
    }

    private handleDisconnected(reason?: DisconnectReason) {
        if (
            reason === DisconnectReason.CLIENT_INITIATED ||
            reason === DisconnectReason.ROOM_CLOSED ||
            reason === DisconnectReason.ROOM_DELETED
        ) {
            // We left, or the back closed the room: the switch / finalize messages handle the cleanup.
            return;
        }

        const disconnectReasonLabel = this.getDisconnectReasonLabel(reason);
        Sentry.captureMessage(`Room disconnected without a valid reason: ${disconnectReasonLabel}`, {
            level: "warning",
            tags: {
                reason: disconnectReasonLabel,
            },
        });

        // livekit-client never reconnects a room once it emitted Disconnected. Tear it down right away so the
        // media stores stop feeding a dead engine (each publish would otherwise hang 15s and stop the user's track).
        this.destroy();

        if (reason === DisconnectReason.DUPLICATE_IDENTITY || reason === DisconnectReason.PARTICIPANT_REMOVED) {
            // Another connection took our place, or the back removed us on purpose: restarting would fight it.
            return;
        }

        // STATE_MISMATCH, JOIN_FAILURE, or no reason at all (livekit-client gave up after its reconnect attempts):
        // ask the back for a fresh invitation. LivekitConnection builds the replacement room when it arrives.
        if (this.everConnected) {
            this.requestRestart();
            return;
        }
        setTimeout(() => {
            if (this.abortSignal.aborted) {
                // The space left LiveKit mode in the meantime
                return;
            }
            this.requestRestart();
        }, RESTART_DELAY_WHEN_NEVER_CONNECTED_MS);
    }

    private requestRestart() {
        analyticsClient.retryConnectionLivekit();
        this.space.emitBackEvent({
            event: {
                $case: "meetingConnectionRestartMessage",
                meetingConnectionRestartMessage: {},
            },
        });
    }

    private parseParticipantMetadata(participant: Participant): ParticipantMetadata {
        if (!participant.metadata) {
            throw new Error("Participant metadata is undefined");
        }
        try {
            const rawMetadata = JSON.parse(participant.metadata);
            return ParticipantMetadataSchema.parse(rawMetadata);
        } catch (error) {
            console.error("Failed to parse participant metadata:", error);
            Sentry.captureException(error);
            throw new Error("Invalid participant metadata", { cause: error });
        }
    }

    private getParticipantId(participant: Participant): string {
        const metadata = this.parseParticipantMetadata(participant);
        return metadata.userId;
    }

    public leaveRoom() {
        if (!this.room) {
            console.error("Room not found");
            Sentry.captureException(new Error("Room not found"));
            return;
        }

        this.room.disconnect(false).catch((err) => {
            console.error("An error occurred in leaveRoom", err);
            Sentry.captureException(err);
        });
    }

    public async dispatchStream(mediaStream: MediaStream): Promise<void> {
        if (!this.localParticipant) {
            console.error("Local participant not found");
            Sentry.captureException(new Error("Local participant not found"));
            return;
        }

        const audioTrack = mediaStream.getAudioTracks()[0];
        if (!audioTrack) {
            console.error("No audio track found in the media stream");
            Sentry.captureException(new Error("No audio track found in the media stream"));
            return;
        }

        if (this.scriptingAudioTrack && this.scriptingAudioTrack !== audioTrack) {
            await this.localParticipant.unpublishTrack(this.scriptingAudioTrack, true);
        }

        if (this.scriptingAudioTrack === audioTrack) {
            return;
        }

        if (!this.isRoomConnected()) {
            // Same reason as the camera / microphone / screen share: publishing now would hang and then stop the
            // track. Published by flushPendingScriptingStream() once the room is (re)connected.
            this.pendingScriptingStream = mediaStream;
            return;
        }

        await this.localParticipant.publishTrack(audioTrack, {
            name: SCRIPTING_AUDIO_TRACK_NAME,
            source: Track.Source.Microphone,
        });
        this.scriptingAudioTrack = audioTrack;
    }

    private handleParticipantConnected(participant: RemoteParticipant) {
        if (this.abortSignal.aborted) {
            return;
        }
        const id = this.getParticipantId(participant);

        // Skip if already registered
        if (this.participants.has(participant.sid)) {
            return;
        }

        const spaceUser = this.space.getSpaceUserBySpaceUserId(id);

        if (!spaceUser) {
            // Store the participant to process later when the spaceUser becomes available
            this.pendingParticipants.set(id, participant);
            return;
        }

        // Skip if this is the local user
        if (spaceUser.spaceUserId === this.space.mySpaceUserId) {
            return;
        }

        this.createLiveKitParticipant(participant, spaceUser);
    }

    /**
     * Creates a LiveKitParticipant and adds it to the participants map
     */
    private createLiveKitParticipant(
        participant: RemoteParticipant,
        spaceUser: ReturnType<SpaceInterface["getSpaceUserBySpaceUserId"]>,
    ) {
        if (!spaceUser) {
            return;
        }

        if (this.participants.has(participant.sid)) {
            return;
        }

        this.participants.set(
            participant.sid,
            new LiveKitParticipant(
                participant,
                spaceUser,
                this.space,
                this.serverUrl,
                this._streamableSubjects,
                this._blockedUsersStore,
                this.abortSignal,
            ),
        );
    }

    /**
     * Processes a specific pending participant when their corresponding spaceUser becomes available.
     * This is more efficient than scanning the entire pending list on every usersStore change.
     * @param spaceUser The spaceUser that just joined the space
     */
    private processPendingParticipantForUser(spaceUser: SpaceUserExtended): void {
        if (this.abortSignal.aborted) {
            return;
        }

        const participant = this.pendingParticipants.get(spaceUser.spaceUserId);
        if (!participant) {
            return;
        }

        // Skip if this is the local user
        if (spaceUser.spaceUserId === this.space.mySpaceUserId) {
            this.pendingParticipants.delete(spaceUser.spaceUserId);
            return;
        }

        this.createLiveKitParticipant(participant, spaceUser);
        this.pendingParticipants.delete(spaceUser.spaceUserId);
    }

    private handleParticipantDisconnected(participant: Participant) {
        const localParticipant = this.participants.get(participant.sid);

        if (localParticipant) {
            localParticipant.destroy();
        }

        this.participants.delete(participant.sid);

        // Also remove from pending participants if present
        const id = this.getParticipantId(participant);
        this.pendingParticipants.delete(id);
    }

    /**
     * A set of previous participant SIDs who were speaking
     */
    private previousSpeakers: Set<string> = new Set();

    private handleActiveSpeakersChanged(speakers: Participant[]) {
        let priority = 0;
        const speakersSet = new Set(speakers.map((s) => s.sid));

        //TODO: review implementation - iterating over all participants each time
        this.participants.forEach((participant) => {
            if (!speakersSet.has(participant.participant.sid)) {
                if (this.previousSpeakers.has(participant.participant.sid)) {
                    // If the participant was previously speaking but is not speaking anymore, we set it as recently spoken
                    const previousSpeakerVideoBox = this.space.allVideoStreamStore.get(
                        participant.participant.identity,
                    );
                    if (previousSpeakerVideoBox) {
                        previousSpeakerVideoBox.lastSpeakTimestamp = Date.now();
                    }
                }
            }
        });

        // Let's reset the priority of the participant
        for (const videoStream of this.space.allVideoStreamStore.values()) {
            const lastSpeakTimestamp = videoStream.lastSpeakTimestamp;
            let bonusPriority = 0;
            if (lastSpeakTimestamp) {
                // If a participant has spoken but is not speaking anymore, we give a bonus priority based on the time since the last speak.
                const lastTimeSinceLastSpeak = Date.now() - lastSpeakTimestamp;
                // The bonus priority is calculated based on the time since the last speak and cannot be greater than 100.
                bonusPriority = 100 * Math.exp(-lastTimeSinceLastSpeak / 100000);
            }
            videoStream.priority = VIDEO_STARTING_PRIORITY + 9999 - bonusPriority;
        }

        for (const speaker of speakers) {
            // The current user is always displayed first, so we skip it
            if (this.space.mySpaceUserId === speaker.identity) {
                continue;
            }
            const extendedVideoStream = this.space.getVideoPeerVideoBox(speaker.identity);

            // If this is a video and not a screen share, we add 2000 to the priority
            if (!extendedVideoStream) {
                continue;
            }

            if (get(extendedVideoStream.streamable)?.displayMode === "cover") {
                extendedVideoStream.priority = priority + VIDEO_STARTING_PRIORITY;
            } else {
                extendedVideoStream.priority = priority + SCREEN_SHARE_STARTING_PRIORITY;
            }
            priority++;
        }

        // Let's trigger an update on the space's videoStreamStore to reorder the view
        // To do so, we just take the first element of the map and put it back in the store at the same key.
        if (get(triggerReorderStore) === 0) {
            triggerReorderStore.set(1);
        } else {
            triggerReorderStore.set(0);
        }

        this.previousSpeakers = speakersSet;
    }

    public destroy(): void {
        if (this.destroyed) {
            // Called both from handleDisconnected() and from LivekitConnection
            return;
        }
        this.destroyed = true;
        try {
            this.unsubscribers.forEach((unsubscriber) => unsubscriber());
            this.rxjsSubscriptions.forEach((subscription) => subscription.unsubscribe());
            this.participants.forEach((participant) => participant.destroy());
            this.pendingParticipants.clear();
            this.room?.off(RoomEvent.ParticipantConnected, this.boundHandleParticipantConnected);
            this.room?.off(RoomEvent.ParticipantDisconnected, this.boundHandleParticipantDisconnected);
            this.room?.off(RoomEvent.ActiveSpeakersChanged, this.boundHandleActiveSpeakersChanged);
            this.room?.off(RoomEvent.Disconnected, this.boundHandleDisconnected);
            this.room?.off(RoomEvent.Reconnected, this.boundHandleReconnected);
            this.room?.off(RoomEvent.AudioPlaybackStatusChanged, this.boundHandleAudioPlaybackStatusChanged);
            this.unregisterAudioPlaybackRetry?.();
            this.unregisterAudioPlaybackRetry = undefined;
            this.leaveRoom();
        } finally {
            this._livekitRoomCounter.decrement();
        }
    }

    /**
     * [DEBUG] Forces the WebSocket connection to close to test reconnection mechanism.
     * This method is for development/testing purposes only.
     * @returns true if the WebSocket was closed, false if no connection exists
     */
    public forceWebSocketClose(): boolean {
        // [JUSTIFICATION] Accessing private LiveKit internals is necessary here because the public API does not expose the WebSocket connection.
        // This use of `any` is limited to this debug-only method to forcibly close the WebSocket for testing reconnection logic.
        // This approach is fragile and may break if LiveKit internals change; do not use as a pattern elsewhere.
        /**
         * [INTERNAL ACCESS WARNING]
         * The following code intentionally accesses private internals of the LiveKit Room object
         * (room.engine.client.ws) for debugging/testing purposes only.
         * This is fragile and may break if the LiveKit SDK changes its internal structure in future versions.
         * Always check for a public API before using this pattern, and do NOT use this in production code.
         */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const engine = (this.room as any)?.engine;
        const client = engine?.client;
        const ws = client?.ws as WebSocket | undefined;

        if (ws) {
            console.info("[DEBUG] Forcing LiveKit WebSocket close to trigger reconnection");
            ws.close();
            return true;
        }

        console.warn("[DEBUG] No LiveKit WebSocket connection found to close");
        return false;
    }
}
