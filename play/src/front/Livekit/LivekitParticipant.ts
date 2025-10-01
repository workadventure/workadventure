import {
    Participant,
    RemoteTrack,
    RemoteTrackPublication,
    TrackPublication,
    ConnectionQuality,
    Track,
    ParticipantEvent,
    RemoteVideoTrack,
    RemoteAudioTrack,
} from "livekit-client";
import { derived, get, Readable, Writable, writable } from "svelte/store";
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
import { LivekitStreamable, Streamable } from "../Stores/StreamableCollectionStore";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { decrementLivekitConnectionsCount, incrementLivekitConnectionsCount } from "../Utils/E2EHooks";
import { localUserStore } from "../Connection/LocalUserStore";

export class LiveKitParticipant {
    private _isSpeakingStore: Writable<boolean>;
    private _connectionQualityStore: Writable<ConnectionQuality>;
    private _videoStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _audioStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _actualVideo: Streamable | undefined;
    private _actualScreenShare: Streamable | undefined;
    private _streamStore = derived(
        [this._videoStreamStore, this._audioStreamStore],
        ([$videoStreamStore, $audioStreamStore]) => {
            const tracks = [];
            if ($videoStreamStore) {
                tracks.push(...$videoStreamStore.getTracks());
            }
            if ($audioStreamStore) {
                tracks.push(...$audioStreamStore.getTracks());
            }

            if (tracks.length === 0) {
                return undefined;
            }

            return new MediaStream(tracks);
        }
    );
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
    private _videoRemoteTrack: RemoteVideoTrack | undefined;
    private _audioRemoteTrack: RemoteAudioTrack | undefined;
    private _screenShareRemoteTrack: RemoteVideoTrack | undefined;
    private _screenShareAudioRemoteTrack: RemoteAudioTrack | undefined;
    private _isActiveSpeaker = writable<boolean>(false);
    public lastSpeakTimestamp?: number;

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
        private highlightedEmbedScreenStore = highlightedEmbedScreen
    ) {
        console.log(localUserStore.getName(), " : Create Livekit Participant : ", spaceUser.name);
        incrementLivekitConnectionsCount();
        this.boundHandleTrackSubscribed = this.handleTrackSubscribed.bind(this);
        this.boundHandleTrackUnsubscribed = this.handleTrackUnsubscribed.bind(this);
        this.boundHandleTrackMuted = this.handleTrackMuted.bind(this);
        this.boundHandleTrackUnmuted = this.handleTrackUnmuted.bind(this);
        this.boundHandleConnectionQualityChanged = this.handleConnectionQualityChanged.bind(this);
        this.boundHandleIsSpeakingChanged = this.handleIsSpeakingChanged.bind(this);

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
        this._isMuted.set(
            this.participant
                .getTrackPublications()
                .some((publication) => publication.source === Track.Source.Microphone && publication.isMuted)
        );
        this._hasVideo.set(
            this.participant
                .getTrackPublications()
                .some((publication) => publication.source === Track.Source.Camera && !publication.isMuted)
        );
        this.updateLivekitVideoStreamStore();
    }

    private handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            this._videoStreamStore.set(track.mediaStream);
            this._hasVideo.set(!track.isMuted);

            this._videoRemoteTrack = track as RemoteVideoTrack;

            this.updateLivekitVideoStreamStore();
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(track.mediaStream);
            this._isMuted.set(track.isMuted);

            this._audioRemoteTrack = track as RemoteAudioTrack;

            this.updateLivekitVideoStreamStore();
        } else if (publication.source === Track.Source.ScreenShare) {
            this._videoScreenShareStreamStore.set(track.mediaStream);

            this._screenShareRemoteTrack = track as RemoteVideoTrack;

            this.updateLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            this._audioScreenShareStreamStore.set(track.mediaStream);

            this._screenShareAudioRemoteTrack = track as RemoteAudioTrack;

            this.updateLivekitScreenShareStreamStore();
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            // this.space.livekitVideoStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._videoRemoteTrack === track) {
                this._videoRemoteTrack = undefined;
            }

            if (this._actualVideo) {
                this._streamableSubjects.videoPeerRemoved.next(this._actualVideo);
            }
        } else if (publication.source === Track.Source.ScreenShare) {
            // this.space.livekitScreenShareStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._screenShareRemoteTrack === track) {
                this._screenShareRemoteTrack = undefined;
            }

            if (this._actualScreenShare) {
                this._streamableSubjects.screenSharingPeerRemoved.next(this._actualScreenShare);
            }
        } else if (publication.source === Track.Source.Microphone) {
            // this.space.livekitAudioStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._audioRemoteTrack === track) {
                this._audioRemoteTrack = undefined;
            }

            // TODO: see what the this.space.allVideoStreamStore is about and if we need to remove the audio stream
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            // this.space.livekitScreenShareAudioStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._screenShareAudioRemoteTrack === track) {
                this._screenShareAudioRemoteTrack = undefined;
            }
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

    public getVideoStream(): Streamable {
        return {
            uniqueId: this.participant.identity,
            hasAudio: this._hasAudio,
            hasVideo: this._hasVideo,
            isMuted: this._isMuted,
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
        };
    }

    public setActiveSpeaker(isActiveSpeaker: boolean) {
        if (get(this._isActiveSpeaker) === true && isActiveSpeaker === false) {
            this.lastSpeakTimestamp = Date.now();
        }
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
