import {
    Participant,
    RemoteTrack,
    RemoteTrackPublication,
    TrackPublication,
    ConnectionQuality,
    Track,
    ParticipantEvent,
    RemoteVideoTrack,
} from "livekit-client";
import { derived, get, Readable, Writable, writable } from "svelte/store";
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { LivekitStreamable, Streamable } from "../Stores/StreamableCollectionStore";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { decrementLivekitConnectionsCount, incrementLivekitConnectionsCount } from "../Utils/E2EHooks";

export class LiveKitParticipant {
    private _isSpeakingStore: Writable<boolean>;
    private _connectionQualityStore: Writable<ConnectionQuality>;
    private _videoStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _audioStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _actualVideo: Streamable | undefined;
    private _actualScreenShare: Streamable | undefined;

    private _videoScreenShareStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(
        undefined
    );
    private _audioScreenShareStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(
        undefined
    );

    private _screenShareStreamStore = derived(
        [this._videoScreenShareStreamStore, this._audioScreenShareStreamStore],
        ([$videoScreenShareStreamStore, $audioScreenShareStreamStore]) => {
            const tracks = [];
            if ($videoScreenShareStreamStore) {
                tracks.push(...$videoScreenShareStreamStore.getTracks());
            }
            if ($audioScreenShareStreamStore) {
                tracks.push(...$audioScreenShareStreamStore.getTracks());
            }

            if (tracks.length === 0) {
                return undefined;
            }

            return new MediaStream(tracks);
        }
    );

    private _nameStore: Writable<string>;
    private _hasAudio = writable<boolean>(true);
    private _hasVideo = writable<boolean>(false);
    private _isMuted = writable<boolean>(true);
    private _spaceUser: SpaceUserExtended;
    private _videoRemoteTrack: Writable<RemoteVideoTrack | undefined> = writable<RemoteVideoTrack | undefined>(
        undefined
    );
    private _screenShareRemoteTrack: Writable<RemoteVideoTrack | undefined> = writable<RemoteVideoTrack | undefined>(
        undefined
    );
    private _isActiveSpeaker = writable<boolean>(false);

    private boundHandleTrackSubscribed: (track: RemoteTrack, publication: RemoteTrackPublication) => void;
    private boundHandleTrackUnsubscribed: (track: RemoteTrack, publication: RemoteTrackPublication) => void;
    private boundHandleTrackMuted: (publication: TrackPublication) => void;
    private boundHandleTrackUnmuted: (publication: TrackPublication) => void;
    private boundHandleConnectionQualityChanged: (quality: ConnectionQuality) => void;
    private boundHandleIsSpeakingChanged: (isSpeaking: boolean) => void;

    constructor(
        public participant: Participant,
        private space: SpaceInterface,
        private spaceUser: SpaceUserExtended,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private abortSignal: AbortSignal
    ) {
        incrementLivekitConnectionsCount();
        this.boundHandleTrackSubscribed = this.handleTrackSubscribed.bind(this);
        this.boundHandleTrackUnsubscribed = this.handleTrackUnsubscribed.bind(this);
        this.boundHandleTrackMuted = this.handleTrackMuted.bind(this);
        this.boundHandleTrackUnmuted = this.handleTrackUnmuted.bind(this);
        this.boundHandleConnectionQualityChanged = this.handleConnectionQualityChanged.bind(this);
        this.boundHandleIsSpeakingChanged = this.handleIsSpeakingChanged.bind(this);

        this._isMuted.set(!this.participant.isMicrophoneEnabled);
        this._hasVideo.set(this.participant.isCameraEnabled);

        this.participant.on(ParticipantEvent.TrackSubscribed, this.boundHandleTrackSubscribed);
        this.participant.on(ParticipantEvent.TrackUnsubscribed, this.boundHandleTrackUnsubscribed);
        this.participant.on(ParticipantEvent.TrackMuted, this.boundHandleTrackMuted);
        this.participant.on(ParticipantEvent.TrackUnmuted, this.boundHandleTrackUnmuted);
        this.participant.on(ParticipantEvent.ConnectionQualityChanged, this.boundHandleConnectionQualityChanged);
        this.participant.on(ParticipantEvent.IsSpeakingChanged, this.boundHandleIsSpeakingChanged);

        this._spaceUser = this.spaceUser;
        this._isSpeakingStore = writable(this.participant.isSpeaking);
        this._connectionQualityStore = writable(this.participant.connectionQuality);
        this._nameStore = writable(this.participant.name);
        this.updateLivekitVideoStreamStore();

        for (const publication of this.participant.getTrackPublications()) {
            const track = publication.track;
            if (track && !publication.isLocal) {
                this.handleTrackSubscribed(track as RemoteTrack, publication as RemoteTrackPublication);
            }
        }
    }

    private handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (this.abortSignal.aborted) {
            return;
        }
        if (publication.source === Track.Source.Camera) {
            this._videoStreamStore.set(track.mediaStream);
            this._hasVideo.set(!track.isMuted);

            this._videoRemoteTrack.set(track as RemoteVideoTrack);

            this.updateLivekitVideoStreamStore();
        } else if (publication.source === Track.Source.ScreenShare) {
            this._videoScreenShareStreamStore.set(track.mediaStream);

            this._screenShareRemoteTrack.set(track as RemoteVideoTrack);

            this.updateLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(track.mediaStream);
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            // this.space.livekitVideoStreamStore.delete(this._spaceUser.spaceUserId);
            if (get(this._videoRemoteTrack) === track) {
                this._videoRemoteTrack.set(undefined);
            }

            if (this._actualVideo) {
                this._streamableSubjects.videoPeerRemoved.next(this._actualVideo);
            }
        } else if (publication.source === Track.Source.ScreenShare) {
            // this.space.livekitScreenShareStreamStore.delete(this._spaceUser.spaceUserId);
            if (get(this._screenShareRemoteTrack) === track) {
                this._screenShareRemoteTrack.set(undefined);
            }

            if (this._actualScreenShare) {
                this._streamableSubjects.screenSharingPeerRemoved.next(this._actualScreenShare);
            }
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(undefined);
        }
    }

    private handleTrackMuted(publication: TrackPublication) {
        if (publication.source === Track.Source.Microphone) {
            this._isMuted.set(true);
        } else if (publication.source === Track.Source.Camera) {
            this._hasVideo.set(false);
        }
    }

    private handleTrackUnmuted(publication: TrackPublication) {
        if (publication.source === Track.Source.Microphone) {
            this._isMuted.set(false);
        } else if (publication.source === Track.Source.Camera) {
            this._hasVideo.set(true);
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

    private updateLivekitScreenShareStreamStore() {
        //Old stream
        const actualScreenShare = this._actualScreenShare;

        if (actualScreenShare) {
            this._streamableSubjects.screenSharingPeerRemoved.next(actualScreenShare);
        }

        // New Stream
        this._actualScreenShare = this.getScreenShareStream();
        this._streamableSubjects.screenSharingPeerAdded.next(this._actualScreenShare);
    }

    private getVideoStream(): Streamable {
        return {
            uniqueId: this.participant.identity,
            hasAudio: this._hasAudio,
            hasVideo: this._spaceUser.reactiveUser.cameraState,
            isMuted: derived(this._spaceUser.reactiveUser.microphoneState, ($microphoneState) => !$microphoneState),
            statusStore: writable("connected"),
            spaceUserId: this._spaceUser.spaceUserId,
            name: this._nameStore,
            showVoiceIndicator: this._isSpeakingStore,
            flipX: false,
            muteAudio: false,
            displayMode: "cover",
            displayInPictureInPictureMode: true,
            usePresentationMode: false,
            media: {
                type: "livekit",
                remoteVideoTrack: this._videoRemoteTrack,
                //remoteAudioTrack: this._audioRemoteTrack,
                // Important note: the stream store only contains the audio track:
                streamStore: this._audioStreamStore,
                isBlocked: derived(this._blockedUsersStore, ($blockedUsersStore) =>
                    $blockedUsersStore.has(this._spaceUser.spaceUserId)
                ),
            } as LivekitStreamable,
            volumeStore: writable(undefined),
            once(event, callback) {
                callback();
            },
            closeStreamable: () => {},
        };
    }

    public getScreenShareStream(): Streamable {
        return {
            uniqueId: this.participant.sid,
            hasAudio: writable(false),
            hasVideo: writable(true),
            isMuted: writable(false),
            statusStore: writable("connected"),
            spaceUserId: this._spaceUser.spaceUserId,
            name: this._nameStore,
            showVoiceIndicator: writable(false),
            flipX: false,
            muteAudio: false,
            displayMode: "fit",
            displayInPictureInPictureMode: true,
            usePresentationMode: true,
            media: {
                type: "livekit",
                remoteVideoTrack: this._screenShareRemoteTrack,
                //remoteAudioTrack: this._screenShareAudioRemoteTrack,
                // Important note: the stream store only contains the audio track:
                streamStore: this._audioScreenShareStreamStore,
                isBlocked: derived(this._blockedUsersStore, ($blockedUsersStore) =>
                    $blockedUsersStore.has(this._spaceUser.spaceUserId)
                ),
            } as LivekitStreamable,
            volumeStore: writable(undefined),
            once(event, callback) {
                callback();
            },
            closeStreamable: () => {},
        };
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

        this.participant.off(ParticipantEvent.TrackSubscribed, this.boundHandleTrackSubscribed);
        this.participant.off(ParticipantEvent.TrackUnsubscribed, this.boundHandleTrackUnsubscribed);
        this.participant.off(ParticipantEvent.TrackMuted, this.boundHandleTrackMuted);
        this.participant.off(ParticipantEvent.TrackUnmuted, this.boundHandleTrackUnmuted);
        this.participant.off(ParticipantEvent.ConnectionQualityChanged, this.boundHandleConnectionQualityChanged);
        this.participant.off(ParticipantEvent.IsSpeakingChanged, this.boundHandleIsSpeakingChanged);
    }
}
