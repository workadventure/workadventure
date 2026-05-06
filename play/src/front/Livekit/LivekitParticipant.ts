import type {
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    TrackPublication,
    ConnectionQuality,
    RemoteVideoTrack,
} from "livekit-client";
import * as Sentry from "@sentry/svelte";
import { Track, ParticipantEvent, VideoQuality } from "livekit-client";
import type { Readable, Unsubscriber, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import type { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { decrementLivekitConnectionsCount, incrementLivekitConnectionsCount } from "../Utils/E2EHooks";
import { volumeProximityDiscussionStore } from "../Stores/PeerStore";
import type { WebRtcStats } from "../Components/Video/WebRtcStats";
import { videoQualityStore } from "../Stores/MediaStore";
import { screenShareQualityStore } from "../Stores/ScreenSharingStore";

import { subscribeToVideoQualityAnalytics } from "../WebRtc/VideoQualityAnalytics";
import { createLivekitWebRtcStats } from "../WebRtc/WebRtcStatsFactory";
import type { LivekitStreamable, Streamable } from "../Space/Streamable";

// Maximize/minimize can briefly mount 2 video components for the same participant.
// Delaying the final unsubscribe avoids sending a false->true bounce to LiveKit during that handoff.
const VIDEO_UNSUBSCRIBE_DELAY_MS = 75;

export class LiveKitParticipant {
    private _isSpeakingStore: Writable<boolean>;
    private _connectionQualityStore: Writable<ConnectionQuality>;
    private _audioStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _actualVideo: Streamable | undefined;
    private _actualScreenShare: Streamable | undefined;

    private _audioScreenShareStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(
        undefined
    );

    private _nameStore: Writable<string>;
    private _hasAudio = writable<boolean>(true);
    private _hasVideo = writable<boolean>(false);
    private _isMuted = writable<boolean>(true);
    private _hasScreenShareVideo = writable<boolean>(false);
    private _hasScreenShareAudio = writable<boolean>(false);
    private _isScreenShareAudioMuted = writable<boolean>(true);
    private _spaceUser: SpaceUserExtended;
    private _videoRemoteTrack: Writable<RemoteVideoTrack | undefined> = writable<RemoteVideoTrack | undefined>(
        undefined
    );
    private _screenShareRemoteTrack: Writable<RemoteVideoTrack | undefined> = writable<RemoteVideoTrack | undefined>(
        undefined
    );
    private _isActiveSpeaker = writable<boolean>(false);
    private _muteAudioStore: Writable<boolean> = writable<boolean>(false);
    private _cameraVideoSubscriptions = new Set<symbol>();
    private _screenShareVideoSubscriptions = new Set<symbol>();
    private _cameraVideoSubscribed = false;
    private _screenShareVideoSubscribed = false;
    private _cameraUnsubscribeTimeout: ReturnType<typeof setTimeout> | undefined;
    private _screenShareUnsubscribeTimeout: ReturnType<typeof setTimeout> | undefined;
    private readonly videoWebrtcStats: Readable<WebRtcStats | undefined>;
    private readonly screenShareWebrtcStats: Readable<WebRtcStats | undefined>;
    private readonly analyticsStatsUnsubscribers: Unsubscriber[] = [];

    private _cameraPublication: RemoteTrackPublication | undefined;
    private _microphonePublication: RemoteTrackPublication | undefined;
    private _screenSharePublication: RemoteTrackPublication | undefined;
    private _screenShareAudioPublication: RemoteTrackPublication | undefined;

    private boundHandleTrackPublished: (publication: RemoteTrackPublication) => void;
    private boundHandleTrackSubscribed: (track: RemoteTrack, publication: RemoteTrackPublication) => void;
    private boundHandleTrackUnpublished: (publication: RemoteTrackPublication) => void;
    private boundHandleTrackUnsubscribed: (track: RemoteTrack, publication: RemoteTrackPublication) => void;
    private boundHandleTrackMuted: (publication: TrackPublication) => void;
    private boundHandleTrackUnmuted: (publication: TrackPublication) => void;
    private boundHandleConnectionQualityChanged: (quality: ConnectionQuality) => void;
    private boundHandleIsSpeakingChanged: (isSpeaking: boolean) => void;

    constructor(
        public participant: RemoteParticipant,
        private spaceUser: SpaceUserExtended,
        private space: SpaceInterface,
        private livekitServerUrl: string,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private abortSignal: AbortSignal,
        private defaultVolume: number = get(volumeProximityDiscussionStore)
    ) {
        incrementLivekitConnectionsCount();
        this.boundHandleTrackPublished = this.handleTrackPublished.bind(this);
        this.boundHandleTrackSubscribed = this.handleTrackSubscribed.bind(this);
        this.boundHandleTrackUnpublished = this.handleTrackUnpublished.bind(this);
        this.boundHandleTrackUnsubscribed = this.handleTrackUnsubscribed.bind(this);
        this.boundHandleTrackMuted = this.handleTrackMuted.bind(this);
        this.boundHandleTrackUnmuted = this.handleTrackUnmuted.bind(this);
        this.boundHandleConnectionQualityChanged = this.handleConnectionQualityChanged.bind(this);
        this.boundHandleIsSpeakingChanged = this.handleIsSpeakingChanged.bind(this);

        this.participant.on(ParticipantEvent.TrackPublished, this.boundHandleTrackPublished);
        this.participant.on(ParticipantEvent.TrackSubscribed, this.boundHandleTrackSubscribed);
        this.participant.on(ParticipantEvent.TrackUnpublished, this.boundHandleTrackUnpublished);
        this.participant.on(ParticipantEvent.TrackUnsubscribed, this.boundHandleTrackUnsubscribed);
        this.participant.on(ParticipantEvent.TrackMuted, this.boundHandleTrackMuted);
        this.participant.on(ParticipantEvent.TrackUnmuted, this.boundHandleTrackUnmuted);
        this.participant.on(ParticipantEvent.ConnectionQualityChanged, this.boundHandleConnectionQualityChanged);
        this.participant.on(ParticipantEvent.IsSpeakingChanged, this.boundHandleIsSpeakingChanged);

        this._spaceUser = this.spaceUser;
        this._isSpeakingStore = writable(this.participant.isSpeaking);
        this._connectionQualityStore = writable(this.participant.connectionQuality);
        this._nameStore = writable(this.participant.name);
        this.videoWebrtcStats = this.getWebrtcStats("video");
        this.screenShareWebrtcStats = this.getWebrtcStats("screenShare");

        for (const publication of this.participant.getTrackPublications()) {
            if (publication.isLocal) {
                continue;
            }

            const remotePublication = publication as RemoteTrackPublication;
            this.handleTrackPublished(remotePublication);

            const track = remotePublication.track;
            if (track) {
                this.handleTrackSubscribed(track, remotePublication);
            }
        }

        this.updateLivekitVideoStreamStore();
        this.analyticsStatsUnsubscribers.push(this.subscribeToAnalyticsStats("video", this.videoWebrtcStats));
        this.analyticsStatsUnsubscribers.push(
            this.subscribeToAnalyticsStats("screenShare", this.screenShareWebrtcStats)
        );
    }

    private acquireVideoSubscription(type: "camera" | "screenShare"): () => void {
        const subscriptions = type === "camera" ? this._cameraVideoSubscriptions : this._screenShareVideoSubscriptions;
        const token = Symbol(type);
        let released = false;

        subscriptions.add(token);
        if (subscriptions.size === 1) {
            // A new viewer arrived before the delayed unsubscribe fired. Keep the current server-side
            // subscription alive so layout churn does not trigger unnecessary LiveKit updates.
            this.clearPendingVideoUnsubscribe(type);
            this.setVideoSubscribed(type, true);
        }

        return () => {
            if (released) {
                return;
            }

            released = true;
            subscriptions.delete(token);
            if (subscriptions.size === 0) {
                this.scheduleVideoUnsubscribe(type);
            }
        };
    }

    private clearPendingVideoUnsubscribe(type: "camera" | "screenShare") {
        const timeout = type === "camera" ? this._cameraUnsubscribeTimeout : this._screenShareUnsubscribeTimeout;
        if (timeout === undefined) {
            return;
        }

        clearTimeout(timeout);

        if (type === "camera") {
            this._cameraUnsubscribeTimeout = undefined;
        } else {
            this._screenShareUnsubscribeTimeout = undefined;
        }
    }

    private scheduleVideoUnsubscribe(type: "camera" | "screenShare") {
        this.clearPendingVideoUnsubscribe(type);

        const timeout = setTimeout(() => {
            if (type === "camera") {
                this._cameraUnsubscribeTimeout = undefined;
                if (this._cameraVideoSubscriptions.size === 0) {
                    // Only unsubscribe if nobody reacquired the video during the short grace period.
                    this.setVideoSubscribed("camera", false);
                }
                return;
            }

            this._screenShareUnsubscribeTimeout = undefined;
            if (this._screenShareVideoSubscriptions.size === 0) {
                // Only unsubscribe if nobody reacquired the screen share during the short grace period.
                this.setVideoSubscribed("screenShare", false);
            }
        }, VIDEO_UNSUBSCRIBE_DELAY_MS);

        if (type === "camera") {
            this._cameraUnsubscribeTimeout = timeout;
        } else {
            this._screenShareUnsubscribeTimeout = timeout;
        }
    }

    private setVideoSubscribed(type: "camera" | "screenShare", subscribed: boolean) {
        if (type === "camera") {
            if (this._cameraVideoSubscribed === subscribed) {
                return;
            }

            this._cameraVideoSubscribed = subscribed;
            this._cameraPublication?.setSubscribed(subscribed);
            return;
        }

        if (this._screenShareVideoSubscribed === subscribed) {
            return;
        }

        this._screenShareVideoSubscribed = subscribed;
        this._screenSharePublication?.setSubscribed(subscribed);
    }

    private syncVideoSubscriptionState(type: "camera" | "screenShare") {
        if (type === "camera") {
            this._cameraPublication?.setSubscribed(this._cameraVideoSubscribed);
            return;
        }

        this._screenSharePublication?.setSubscribed(this._screenShareVideoSubscribed);
    }

    private handleTrackPublished(publication: RemoteTrackPublication) {
        if (this.abortSignal.aborted) {
            return;
        }

        if (publication.source === Track.Source.Camera) {
            if (this._cameraPublication && this._cameraPublication !== publication) {
                console.warn(
                    "Camera track received on a publication that is not the one we expected. This should not happen."
                );
                Sentry.captureMessage(
                    "Camera track received on a publication that is not the one we expected. This should not happen."
                );
                this._cameraPublication.setSubscribed(false);
            }
            this._cameraPublication = publication;
            this._hasVideo.set(!publication.isMuted);
            this.syncVideoSubscriptionState("camera");
        } else if (publication.source === Track.Source.ScreenShare) {
            if (this._screenSharePublication && this._screenSharePublication !== publication) {
                console.warn(
                    "Screen share track received on a publication that is not the one we expected. This should not happen."
                );
                Sentry.captureMessage(
                    "Screen share track received on a publication that is not the one we expected. This should not happen."
                );
                this._screenSharePublication.setSubscribed(false);
            }
            this._screenSharePublication = publication;
            this._hasScreenShareVideo.set(!publication.isMuted);
            this.syncVideoSubscriptionState("screenShare");
            this.refreshLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            if (this._screenShareAudioPublication && this._screenShareAudioPublication !== publication) {
                console.warn(
                    "Screen share audio track received on a publication that is not the one we expected. This should not happen."
                );
                Sentry.captureMessage(
                    "Screen share audio track received on a publication that is not the one we expected. This should not happen."
                );
                this._screenShareAudioPublication.setSubscribed(false);
            }
            publication.setSubscribed(true);
            this._screenShareAudioPublication = publication;
            this._hasScreenShareAudio.set(true);
            this._isScreenShareAudioMuted.set(publication.isMuted);
            this.refreshLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.Microphone) {
            if (this._microphonePublication && this._microphonePublication !== publication) {
                console.warn(
                    "Microphone track received on a publication that is not the one we expected. This should not happen."
                );
                Sentry.captureMessage(
                    "Microphone track received on a publication that is not the one we expected. This should not happen."
                );
                this._microphonePublication.setSubscribed(false);
            }
            publication.setSubscribed(true);
            this._microphonePublication = publication;
            this._hasAudio.set(true);
            this._isMuted.set(publication.isMuted);
        }
    }

    private handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (this.abortSignal.aborted) {
            return;
        }
        if (publication.source === Track.Source.Camera) {
            this._videoRemoteTrack.set(track as RemoteVideoTrack);

            // Apply video quality based on bandwidth setting
            const videoQualitySetting = get(videoQualityStore);
            // If the setting is low, do not go in resolution above MEDIUM
            if (videoQualitySetting === "low") {
                publication.setVideoQuality(VideoQuality.MEDIUM);
            }
        } else if (publication.source === Track.Source.ScreenShare) {
            this._screenShareRemoteTrack.set(track as RemoteVideoTrack);

            // Apply video quality based on screen share bandwidth setting
            const screenShareQualitySetting = get(screenShareQualityStore);
            // If the setting is low, do not go in resolution above MEDIUM
            if (screenShareQualitySetting === "low") {
                publication.setVideoQuality(VideoQuality.MEDIUM);
            }
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            this._audioScreenShareStreamStore.set(track.mediaStream);
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(track.mediaStream);
        }
    }

    private handleTrackUnpublished(publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            publication.setSubscribed(false);
            if (this._cameraPublication === publication) {
                this._cameraPublication = undefined;
            }
            this._videoRemoteTrack.set(undefined);
            this._hasVideo.set(false);
        } else if (publication.source === Track.Source.ScreenShare) {
            publication.setSubscribed(false);
            if (this._screenSharePublication === publication) {
                this._screenSharePublication = undefined;
            }
            this._screenShareRemoteTrack.set(undefined);
            this._hasScreenShareVideo.set(false);
            this.refreshLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            publication.setSubscribed(false);
            if (this._screenShareAudioPublication === publication) {
                this._screenShareAudioPublication = undefined;
            }
            this._audioScreenShareStreamStore.set(undefined);
            this._hasScreenShareAudio.set(false);
            this._isScreenShareAudioMuted.set(true);
            this.refreshLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.Microphone) {
            publication.setSubscribed(false);
            if (this._microphonePublication === publication) {
                this._microphonePublication = undefined;
            }
            this._audioStreamStore.set(undefined);
            this._isMuted.set(true);
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            if (get(this._videoRemoteTrack) === track) {
                this._videoRemoteTrack.set(undefined);
            }
        } else if (publication.source === Track.Source.ScreenShare) {
            if (get(this._screenShareRemoteTrack) === track) {
                this._screenShareRemoteTrack.set(undefined);
            }
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            this._audioScreenShareStreamStore.set(undefined);
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(undefined);
        }
    }

    private handleTrackMuted(publication: TrackPublication) {
        if (publication.source === Track.Source.Microphone) {
            this._isMuted.set(true);
        } else if (publication.source === Track.Source.Camera) {
            this._hasVideo.set(false);
        } else if (publication.source === Track.Source.ScreenShare) {
            this._hasScreenShareVideo.set(false);
            this.refreshLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            this._isScreenShareAudioMuted.set(true);
        }
    }

    private handleTrackUnmuted(publication: TrackPublication) {
        if (publication.source === Track.Source.Microphone) {
            this._isMuted.set(false);
        } else if (publication.source === Track.Source.Camera) {
            this._hasVideo.set(true);
        } else if (publication.source === Track.Source.ScreenShare) {
            this._hasScreenShareVideo.set(true);
            this.refreshLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            this._isScreenShareAudioMuted.set(false);
        }
    }

    private handleConnectionQualityChanged(quality: ConnectionQuality) {
        this._connectionQualityStore.set(quality);
    }

    private handleIsSpeakingChanged(isSpeaking: boolean) {
        this._isSpeakingStore.set(isSpeaking);
    }

    private updateLivekitVideoStreamStore() {
        //Old stream
        const actualVideo = this._actualVideo;

        if (actualVideo) {
            this._streamableSubjects.videoPeerRemoved.next(actualVideo);
        }

        // New Stream
        this._actualVideo = this.getVideoStream();
        this._streamableSubjects.videoPeerAdded.next(this._actualVideo);
    }

    private refreshLivekitScreenShareStreamStore() {
        const shouldHaveScreenShareStream = get(this._hasScreenShareVideo) || get(this._hasScreenShareAudio);

        if (!shouldHaveScreenShareStream) {
            if (this._actualScreenShare) {
                const actualScreenShare = this._actualScreenShare;
                this._actualScreenShare = undefined;
                this._streamableSubjects.screenSharingPeerRemoved.next(actualScreenShare);
            }
            return;
        }

        if (!this._actualScreenShare) {
            this._actualScreenShare = this.getScreenShareStream();
            this._streamableSubjects.screenSharingPeerAdded.next(this._actualScreenShare);
        }
    }

    private getVideoStream(): Streamable {
        return {
            uniqueId: this.participant.identity,
            hasAudio: this._hasAudio,
            hasVideo: derived(
                [this._spaceUser.reactiveUser.cameraState, this._hasVideo],
                ([$spaceCameraState, $livekitHasVideo]) => {
                    return $spaceCameraState && $livekitHasVideo;
                }
            ),
            isMuted: derived(
                [this._spaceUser.reactiveUser.microphoneState, this._isMuted],
                ([$spaceMicrophoneState, $livekitIsMuted]) => {
                    return !$spaceMicrophoneState || $livekitIsMuted;
                }
            ),
            statusStore: writable("connected"),
            spaceUserId: this._spaceUser.spaceUserId,
            name: this._nameStore,
            showVoiceIndicator: this._isSpeakingStore,
            flipX: false,
            muteAudio: this._muteAudioStore,
            displayMode: "cover",
            displayInPictureInPictureMode: true,
            usePresentationMode: false,
            media: {
                type: "livekit",
                remoteVideoTrack: this._videoRemoteTrack,
                // Important note: the stream store only contains the audio track:
                streamStore: this._audioStreamStore,
                isBlocked: derived(this._blockedUsersStore, ($blockedUsersStore) =>
                    $blockedUsersStore.has(this._spaceUser.spaceUserId)
                ),
                acquireVideoSubscription: () => this.acquireVideoSubscription("camera"),
            } as LivekitStreamable,
            volumeStore: writable(undefined),
            volume: writable(this.defaultVolume),
            closeStreamable: () => {},
            canCloseStreamable: () => false,
            videoType: "video",
            webrtcStats: this.videoWebrtcStats,
        };
    }

    private getScreenShareStream(): Streamable {
        return {
            uniqueId: this.participant.sid,
            hasAudio: this._hasScreenShareAudio,
            hasVideo: this._hasScreenShareVideo,
            isMuted: this._isScreenShareAudioMuted,
            statusStore: writable("connected"),
            spaceUserId: this._spaceUser.spaceUserId,
            name: this._nameStore,
            showVoiceIndicator: writable(false),
            flipX: false,
            muteAudio: writable(false),
            displayMode: "fit",
            displayInPictureInPictureMode: true,
            usePresentationMode: true,
            media: {
                type: "livekit",
                remoteVideoTrack: this._screenShareRemoteTrack,
                // Important note: the stream store contains the audio track from ScreenShareAudio
                streamStore: this._audioScreenShareStreamStore,
                isBlocked: derived(this._blockedUsersStore, ($blockedUsersStore) =>
                    $blockedUsersStore.has(this._spaceUser.spaceUserId)
                ),
                acquireVideoSubscription: () => this.acquireVideoSubscription("screenShare"),
            } as LivekitStreamable,
            volumeStore: writable(undefined),
            volume: writable(this.defaultVolume),
            closeStreamable: () => {},
            canCloseStreamable: () => false,
            videoType: "screenSharing",
            webrtcStats: this.screenShareWebrtcStats,
        };
    }

    private getWebrtcStats(type: "video" | "screenShare"): Readable<WebRtcStats | undefined> {
        const trackStore = type === "video" ? this._videoRemoteTrack : this._screenShareRemoteTrack;
        return derived([trackStore], ([$track], set) => {
            if ($track) {
                const statsStore = createLivekitWebRtcStats($track);
                const statsUnsubscribe = statsStore.subscribe(set);
                return () => {
                    statsUnsubscribe();
                };
            } else {
                set(undefined);
                return () => {};
            }
        });
    }

    private subscribeToAnalyticsStats(
        type: "video" | "screenShare",
        statsStore: Readable<WebRtcStats | undefined>
    ): Unsubscriber {
        return subscribeToVideoQualityAnalytics(
            statsStore,
            {
                streamId: `${this.participant.sid}:${type}`,
                streamCategory: type === "video" ? "video" : "screenSharing",
                transportType: "Livekit",
                remoteSpaceUserId: this._spaceUser.spaceUserId,
                remoteUserUuid: this._spaceUser.uuid,
                spaceName: this.space.getName(),
                livekitServerUrl: this.livekitServerUrl,
            },
            (message) => this.space.emitVideoQualityReport(message)
        );
    }

    public setActiveSpeaker(isActiveSpeaker: boolean) {
        this._isActiveSpeaker.set(isActiveSpeaker);
    }

    public getStreamable(): Streamable {
        return this.getVideoStream();
    }

    public getScreenSharingStreamable(): Streamable {
        return this.getScreenShareStream();
    }

    public destroy() {
        decrementLivekitConnectionsCount();
        this.analyticsStatsUnsubscribers.forEach((unsubscribe) => unsubscribe());
        this.analyticsStatsUnsubscribers.length = 0;

        if (this._actualVideo) {
            this._streamableSubjects.videoPeerRemoved.next(this._actualVideo);
            this._actualVideo = undefined;
        }

        if (this._actualScreenShare) {
            this._streamableSubjects.screenSharingPeerRemoved.next(this._actualScreenShare);
            this._actualScreenShare = undefined;
        }

        this.clearPendingVideoUnsubscribe("camera");
        this.clearPendingVideoUnsubscribe("screenShare");
        this._cameraVideoSubscriptions.clear();
        this._screenShareVideoSubscriptions.clear();
        this._cameraVideoSubscribed = false;
        this._screenShareVideoSubscribed = false;
        this._cameraPublication?.setSubscribed(false);
        this._microphonePublication?.setSubscribed(false);
        this._screenSharePublication?.setSubscribed(false);
        this._screenShareAudioPublication?.setSubscribed(false);

        this.participant.off(ParticipantEvent.TrackPublished, this.boundHandleTrackPublished);
        this.participant.off(ParticipantEvent.TrackSubscribed, this.boundHandleTrackSubscribed);
        this.participant.off(ParticipantEvent.TrackUnpublished, this.boundHandleTrackUnpublished);
        this.participant.off(ParticipantEvent.TrackUnsubscribed, this.boundHandleTrackUnsubscribed);
        this.participant.off(ParticipantEvent.TrackMuted, this.boundHandleTrackMuted);
        this.participant.off(ParticipantEvent.TrackUnmuted, this.boundHandleTrackUnmuted);
        this.participant.off(ParticipantEvent.ConnectionQualityChanged, this.boundHandleConnectionQualityChanged);
        this.participant.off(ParticipantEvent.IsSpeakingChanged, this.boundHandleIsSpeakingChanged);
    }
}
