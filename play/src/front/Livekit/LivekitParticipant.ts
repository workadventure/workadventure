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
import * as Sentry from "@sentry/svelte";
import { derived, Writable, writable } from "svelte/store";
import { SpaceUserExtended } from "../Space/SpaceFilter/SpaceFilter";
import { MediaStoreStreamable, Streamable } from "../Stores/StreamableCollectionStore";
import { PeerStatus } from "../WebRtc/VideoPeer";
import { SpaceInterface } from "../Space/SpaceInterface";
import { RemotePlayerData } from "../Phaser/Game/RemotePlayersRepository";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";

//TODO : revoir le nom
export type ExtendedStreamable = Streamable & {
    player: RemotePlayerData | undefined;
    userId: number;
    media: MediaStoreStreamable;
};

export class LiveKitParticipant {
    private _isSpeakingStore: Writable<boolean>;
    private _connectionQualityStore: Writable<ConnectionQuality>;
    private _videoStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _audioStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
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
    private _screenShareStreamStore: Writable<MediaStream | undefined> = writable<MediaStream | undefined>(undefined);
    private _nameStore: Writable<string>;
    private _hasAudio = writable<boolean>(true);
    private _hasVideo = writable<boolean>(false);
    private _isMuted = writable<boolean>(true);
    private _spaceUser: SpaceUserExtended;
    private _videoRemoteTrack: RemoteTrack | undefined;
    private _screenShareRemoteTrack: RemoteTrack | undefined;
    private _videoElements: HTMLVideoElement[] = [];
    private _screenShareElements: HTMLVideoElement[] = [];

    constructor(
        private participant: Participant,
        private space: SpaceInterface,
        private spaceUser: SpaceUserExtended,
        private highlightedEmbedScreenStore = highlightedEmbedScreen
    ) {
        this.listenToParticipantEvents();
        this._spaceUser = this.spaceUser;
        this._isSpeakingStore = writable(this.participant.isSpeaking);
        this._connectionQualityStore = writable(this.participant.connectionQuality);
        this._nameStore = writable(this.participant.name);
        this.initializeTracks();
    }

    private initializeTracks() {
        this.participant.trackPublications.forEach((publication: TrackPublication) => {
            const track = publication.track;
            if (track) {
                if (publication.source === Track.Source.Camera) {
                    this._videoStreamStore.set(track.mediaStream);

                    //TODO : remove as RemoteVideoTrack
                    this._videoRemoteTrack = track as RemoteVideoTrack;
                    this._hasVideo.set(!track.isMuted);
                    const videoElements = this.space.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
                    videoElements.forEach((videoElement) => {
                        videoElement.autoplay = true;
                        videoElement.playsInline = true;
                        videoElement.muted = track.isMuted;
                        track.attach(videoElement);
                    });

                    this.updateLivekitVideoStreamStore().catch((e) => {
                        console.error("Error while updating livekit video stream store", e);
                        Sentry.captureException(e);
                    });
                } else if (publication.source === Track.Source.Microphone) {
                    this._audioStreamStore.set(track.mediaStream);
                    this._isMuted.set(track.isMuted);
                    this.updateLivekitVideoStreamStore().catch((e) => {
                        console.error("Error while updating livekit video stream store", e);
                        Sentry.captureException(e);
                    });
                } else if (publication.source === Track.Source.ScreenShare) {
                    this._screenShareStreamStore.set(track.mediaStream);
                    const screenElements = this.space.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
                    screenElements.forEach((screenElement) => {
                        screenElement.autoplay = true;
                        screenElement.playsInline = true;
                        screenElement.muted = track.isMuted;
                        track.attach(screenElement);
                    });
                    this.updateLivekitScreenShareStreamStore().catch((e) => {
                        console.error("Error while updating livekit screen share stream store", e);
                        Sentry.captureException(e);
                    });
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

            this._videoRemoteTrack = track;

            this.space.videoContainerMap.get(this._spaceUser.spaceUserId)?.forEach((videoElement) => {
                videoElement.autoplay = true;
                videoElement.playsInline = true;
                videoElement.muted = track.isMuted;
                track.attach(videoElement);
            });

            this.updateLivekitVideoStreamStore().catch(() => {
                console.error("Error updating livekit video stream store");
            });
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(track.mediaStream);
            this._isMuted.set(track.isMuted);
            this.updateLivekitVideoStreamStore().catch(() => {
                console.error("Error updating livekit video stream store");
            });
        } else if (publication.source === Track.Source.ScreenShare) {
            this._screenShareStreamStore.set(track.mediaStream);

            // Create and attach screen share element
            this._screenShareRemoteTrack = track;

            const screenElements = this.space.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
            screenElements.forEach((screenElement) => {
                screenElement.autoplay = true;
                screenElement.playsInline = true;
                screenElement.muted = track.isMuted;
                track.attach(screenElement);
            });

            this.updateLivekitScreenShareStreamStore().catch(() => {
                console.error("Error updating livekit screen share stream store");
            });
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            //this._screenShareAudioStreamStore.set(track.mediaStream);
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            // this.space.livekitVideoStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._videoRemoteTrack === track) {
                this._videoRemoteTrack = undefined;
                const videoElements = this.space.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
                videoElements.forEach((videoElement) => {
                    track.detach(videoElement);
                    videoElement.remove();
                });
            }
        } else if (publication.source === Track.Source.ScreenShare) {
            // this.space.livekitScreenShareStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._screenShareRemoteTrack === track) {
                this._screenShareRemoteTrack = undefined;
                const screenElements = this.space.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
                screenElements.forEach((screenElement) => {
                    track.detach(screenElement);
                    screenElement.remove();
                });
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

    private async updateLivekitVideoStreamStore() {
        const videoStream = await this.getVideoStream();
        this.space.livekitVideoStreamStore.set(this._spaceUser.spaceUserId, videoStream);
    }

    private async updateLivekitScreenShareStreamStore() {
        const screenShareStream = await this.getScreenShareStream();
        this.space.livekitScreenShareStreamStore.set(this._spaceUser.spaceUserId, screenShareStream);
    }

    public async getVideoStream(): Promise<ExtendedStreamable> {
        const player = await this._spaceUser.getPlayer();
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
            usePresentationMode: false,
            media: {
                type: "mediaStore",
                streamStore: this._streamStore,
                attach: (container: HTMLVideoElement) => {
                    const videoElements = this.space.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
                    videoElements.push(container);
                    this.space.videoContainerMap.set(this._spaceUser.spaceUserId, videoElements);

                    if (this._videoRemoteTrack) {
                        this._videoRemoteTrack.attach(container);
                    }
                },
                detach: (container: HTMLVideoElement) => {
                    let videoElements = this.space.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
                    videoElements = videoElements.filter((element) => element !== container);
                    this.space.videoContainerMap.set(this._spaceUser.spaceUserId, videoElements);

                    if (this._videoRemoteTrack) {
                        this._videoRemoteTrack.detach(container);
                    }
                },
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
            player,
            userId: this._spaceUser.userId,
        };
    }

    public async getScreenShareStream(): Promise<ExtendedStreamable> {
        const player = await this._spaceUser.getPlayer();
        const streamble: ExtendedStreamable = {
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
            usePresentationMode: true,
            media: {
                type: "mediaStore",
                streamStore: this._screenShareStreamStore,
                attach: (container: HTMLVideoElement) => {
                    const screenElements = this.space.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
                    screenElements.push(container);
                    this.space.screenShareContainerMap.set(this._spaceUser.spaceUserId, screenElements);
                    if (this._screenShareRemoteTrack) {
                        this._screenShareRemoteTrack.attach(container);
                    }
                },
                detach: (container: HTMLVideoElement) => {
                    let screenElements = this.space.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
                    screenElements = screenElements.filter((element) => element !== container);
                    this.space.screenShareContainerMap.set(this._spaceUser.spaceUserId, screenElements);
                    if (this._screenShareRemoteTrack) {
                        this._screenShareRemoteTrack.detach(container);
                    }
                },
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
            player,
            userId: this._spaceUser.userId,
        };

        this.highlightedEmbedScreenStore.toggleHighlight(streamble);

        return streamble;
    }

    public destroy() {
        this._videoElements.forEach((videoElement) => {
            videoElement.remove();
        });
        this._screenShareElements.forEach((screenElement) => {
            screenElement.remove();
        });

        this.participant.off(ParticipantEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
        this.participant.off(ParticipantEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
        this.participant.off(ParticipantEvent.TrackMuted, this.handleTrackMuted.bind(this));
        this.participant.off(ParticipantEvent.TrackUnmuted, this.handleTrackUnmuted.bind(this));
        this.participant.off(ParticipantEvent.ConnectionQualityChanged, this.handleConnectionQualityChanged.bind(this));
        this.participant.off(ParticipantEvent.IsSpeakingChanged, this.handleIsSpeakingChanged.bind(this));
    }
}
