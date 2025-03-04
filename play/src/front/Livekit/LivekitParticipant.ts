import { Participant, RemoteTrack, RemoteTrackPublication, TrackPublication, ConnectionQuality } from "livekit-client";
import { derived, Writable, writable } from "svelte/store";
import { SpaceUserExtended } from "../Space/SpaceFilter/SpaceFilter";
import { Streamable } from "../Stores/StreamableCollectionStore";
import { PeerStatus } from "../WebRtc/VideoPeer";

import { SpaceInterface } from "../Space/SpaceInterface";

export class LiveKitParticipant {
    private _isSpeakingStore: Writable<boolean> = writable(this.participant.isSpeaking);
    private _connectionQualityStore: Writable<ConnectionQuality> = writable(this.participant.connectionQuality);
    private _videoStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _audioStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _screenShareStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _nameStore: Writable<string> = writable<string>(this.participant.name);
    private _hasAudio = writable<boolean>(true);
    private _hasVideo = writable<boolean>(false);
    private _isMuted = writable<boolean>(true);
    private _spaceUser: SpaceUserExtended;

    constructor(private participant: Participant, private space: SpaceInterface, private spaceUser: SpaceUserExtended) {
        this.listenToParticipantEvents();
        this._spaceUser = this.spaceUser;
        this._isSpeakingStore.set(this.participant.isSpeaking);
        this._connectionQualityStore.set(this.participant.connectionQuality);
    }

    private listenToParticipantEvents() {
        this.participant.on("trackSubscribed", this.handleTrackSubscribed.bind(this));
        this.participant.on("trackUnsubscribed", this.handleTrackUnsubscribed.bind(this));
        this.participant.on("trackMuted", this.handleTrackMuted.bind(this));
        this.participant.on("trackUnmuted", this.handleTrackUnmuted.bind(this));
        this.participant.on("connectionQualityChanged", this.handleConnectionQualityChanged.bind(this));
        this.participant.on("isSpeakingChanged", this.handleIsSpeakingChanged.bind(this));
    }

    private handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === "camera") {
            this._videoStreamStore.set(track.mediaStream);
            this._hasVideo.set(!track.isMuted);
            this.updateLivekitVideoStreamStore();
        } else if (publication.source === "microphone") {
            this._audioStreamStore.set(track.mediaStream);
            this._isMuted.set(track.isMuted);
            this.updateLivekitVideoStreamStore();
        } else if (publication.source === "screen_share") {
            this._screenShareStreamStore.set(track.mediaStream);
            this.updateLivekitScreenShareStreamStore();
        } else if (publication.source === "screen_share_audio") {
            //this._screenShareAudioStreamStore.set(track.mediaStream);
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === "camera") {
            this.space.livekitVideoStreamStore.delete(this._spaceUser.id);
        } else if (publication.source === "screen_share") {
            this.space.livekitScreenShareStreamStore.delete(this._spaceUser.id);
        }
    }

    private handleTrackMuted(publication: TrackPublication) {
        if (publication.source === "microphone") {
            this._isMuted.set(true);
        } else if (publication.source === "camera") {
            this._hasVideo.set(false);
        }
    }

    private handleTrackUnmuted(publication: TrackPublication) {
        if (publication.source === "microphone") {
            this._isMuted.set(false);
        } else if (publication.source === "camera") {
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
        this.space.livekitVideoStreamStore.set(this._spaceUser.id, this.getVideoStream());
    }

    private updateLivekitScreenShareStreamStore() {
        this.space.livekitScreenShareStreamStore.set(this._spaceUser.id, this.getScreenShareStream());
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
            media: {
                type: "mediaStore",
                streamStore: this._screenShareStreamStore,
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
        };
    }

    public destroy() {
        this.participant.off("trackSubscribed", this.handleTrackSubscribed.bind(this));
        this.participant.off("trackUnsubscribed", this.handleTrackUnsubscribed.bind(this));
        this.participant.off("trackMuted", this.handleTrackMuted.bind(this));
        this.participant.off("trackUnmuted", this.handleTrackUnmuted.bind(this));
        this.participant.off("connectionQualityChanged", this.handleConnectionQualityChanged.bind(this));
        this.participant.off("isSpeakingChanged", this.handleIsSpeakingChanged.bind(this));
    }
}
