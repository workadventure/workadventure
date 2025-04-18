import {
    Participant,
    RemoteTrack,
    RemoteTrackPublication,
    TrackPublication,
    ConnectionQuality,
    Track,
    ParticipantEvent,
} from "livekit-client";
import { derived, Writable, writable } from "svelte/store";
import { SpaceUserExtended } from "../Space/SpaceFilter/SpaceFilter";
import { Streamable } from "../Stores/StreamableCollectionStore";
import { PeerStatus } from "../WebRtc/VideoPeer";
import { SpaceInterface } from "../Space/SpaceInterface";

export class LiveKitParticipant {
    private _isSpeakingStore: Writable<boolean>;
    private _connectionQualityStore: Writable<ConnectionQuality>;
    private _videoStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _audioStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _screenShareStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _nameStore: Writable<string>;
    private _hasAudio = writable<boolean>(true);
    private _hasVideo = writable<boolean>(false);
    private _isMuted = writable<boolean>(true);
    private _spaceUser: SpaceUserExtended;

    constructor(private participant: Participant, private space: SpaceInterface, private spaceUser: SpaceUserExtended) {
        this.listenToParticipantEvents();
        this._spaceUser = this.spaceUser;
        this._isSpeakingStore = writable(this.participant.isSpeaking);
        this._connectionQualityStore = writable(this.participant.connectionQuality);
        this._nameStore = writable(this.participant.name);
        this.initializeTracks();
    }

    private initializeTracks() {
        this.participant.trackPublications.forEach((publication: TrackPublication) => {
            if (publication.track) {
                if (publication.source === Track.Source.Camera) {
                    this._videoStreamStore.set(publication.track.mediaStream);
                    this._hasVideo.set(!publication.track.isMuted);
                    this.updateLivekitVideoStreamStore();
                } else if (publication.source === Track.Source.Microphone) {
                    this._audioStreamStore.set(publication.track.mediaStream);
                    this._isMuted.set(publication.track.isMuted);
                    this.updateLivekitVideoStreamStore();
                } else if (publication.source === Track.Source.ScreenShare) {
                    this._screenShareStreamStore.set(publication.track.mediaStream);
                    this.updateLivekitScreenShareStreamStore();
                }
            }
        });
    }

    private listenToParticipantEvents() {
        this.participant.on(ParticipantEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
        this.participant.on(ParticipantEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
        this.participant.on(ParticipantEvent.TrackMuted, this.handleTrackMuted.bind(this));
        this.participant.on(ParticipantEvent.TrackUnmuted, this.handleTrackUnmuted.bind(this));
        this.participant.on(ParticipantEvent.ConnectionQualityChanged, this.handleConnectionQualityChanged.bind(this));
        this.participant.on(ParticipantEvent.IsSpeakingChanged, this.handleIsSpeakingChanged.bind(this));
    }

    private handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            this._videoStreamStore.set(track.mediaStream);
            this._hasVideo.set(!track.isMuted);
            this.updateLivekitVideoStreamStore();
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(track.mediaStream);
            this._isMuted.set(track.isMuted);
            this.updateLivekitVideoStreamStore();
        } else if (publication.source === Track.Source.ScreenShare) {
            this._screenShareStreamStore.set(track.mediaStream);
            this.updateLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            //this._screenShareAudioStreamStore.set(track.mediaStream);
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        console.log(">>>> handleTrackUnsubscribed", {
            spaceUserId: this._spaceUser.spaceUserId,
            track: track.kind,
        });
        if (publication.source === Track.Source.Camera) {
           // this.space.livekitVideoStreamStore.delete(this._spaceUser.spaceUserId);
        } else if (publication.source === Track.Source.ScreenShare) {
            this.space.livekitScreenShareStreamStore.delete(this._spaceUser.spaceUserId);
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
        console.log(">>>> updateLivekitVideoStreamStore", {
            spaceUserId: this._spaceUser.spaceUserId,
        });
        this.space.livekitVideoStreamStore.set(this._spaceUser.spaceUserId, this.getVideoStream());
    }

    private updateLivekitScreenShareStreamStore() {
        this.space.livekitScreenShareStreamStore.set(this._spaceUser.spaceUserId, this.getScreenShareStream());
    }

    public getVideoStream(): Streamable {
        return {
            uniqueId: this.participant.identity,
            hasAudio: this._hasAudio,
            hasVideo: this._hasVideo,
            isMuted: this._isMuted,
            statusStore: writable<PeerStatus>("connected"),
            getExtendedSpaceUser: () => Promise.resolve(this._spaceUser),
            name: this._nameStore,
            showVoiceIndicator: this._isSpeakingStore,
            flipX: false,
            muteAudio: false,
            displayMode: "cover",
            displayInPictureInPictureMode: true,
            media: {
                type: "mediaStore",
                streamStore: derived(
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
                ),
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
        };
    }

    public getScreenShareStream(): Streamable {
        return {
            uniqueId: this.participant.sid,
            hasAudio: writable(false),
            hasVideo: writable(true),
            isMuted: writable(false),
            statusStore: writable<PeerStatus>("connected"),
            getExtendedSpaceUser: () => Promise.resolve(this._spaceUser),
            name: this._nameStore,
            showVoiceIndicator: writable(false),
            flipX: false,
            muteAudio: false,
            displayMode: "fit",
            displayInPictureInPictureMode: true,
            media: {
                type: "mediaStore",
                streamStore: this._screenShareStreamStore,
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
        };
    }

    public destroy() {
        this.participant.off(ParticipantEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
        this.participant.off(ParticipantEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
        this.participant.off(ParticipantEvent.TrackMuted, this.handleTrackMuted.bind(this));
        this.participant.off(ParticipantEvent.TrackUnmuted, this.handleTrackUnmuted.bind(this));
        this.participant.off(ParticipantEvent.ConnectionQualityChanged, this.handleConnectionQualityChanged.bind(this));
        this.participant.off(ParticipantEvent.IsSpeakingChanged, this.handleIsSpeakingChanged.bind(this));
    }
}
