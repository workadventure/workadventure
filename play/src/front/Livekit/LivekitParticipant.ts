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
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
import { ExtendedStreamable } from "../Stores/StreamableCollectionStore";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";

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
    private _videoRemoteTrack: RemoteTrack | undefined;
    private _screenShareRemoteTrack: RemoteTrack | undefined;
    private _isActiveSpeaker = writable<boolean>(false);

    constructor(
        public participant: Participant,
        private space: SpaceInterface,
        private spaceUser: SpaceUserExtended,
        private _streamableSubjects: StreamableSubjects,
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
            const track: RemoteTrack | Track | undefined = publication.track;
            if (track) {
                if (publication.source === Track.Source.Camera) {
                    this._videoStreamStore.set(track.mediaStream);

                    this._videoRemoteTrack = track as RemoteVideoTrack;
                    this._hasVideo.set(!track.isMuted);
                    const videoElements =
                        this.space.spacePeerManager.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
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
                    this._videoScreenShareStreamStore.set(track.mediaStream);
                    const screenElements =
                        this.space.spacePeerManager.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
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
                } else if (publication.source === Track.Source.ScreenShareAudio) {
                    this._audioScreenShareStreamStore.set(track.mediaStream);
                    this.updateLivekitScreenShareStreamStore().catch((e) => {
                        console.error("Error while updating livekit screen share stream store", e);
                        Sentry.captureException(e);
                    });
                }
            }
        });
    }

    private handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            this._videoStreamStore.set(track.mediaStream);
            this._hasVideo.set(!track.isMuted);

            this._videoRemoteTrack = track;

            this.space.spacePeerManager.videoContainerMap.get(this._spaceUser.spaceUserId)?.forEach((videoElement) => {
                videoElement.autoplay = true;
                videoElement.playsInline = true;
                videoElement.muted = track.isMuted;
                track.attach(videoElement);
            });

            this.updateLivekitVideoStreamStore().catch((e) => {
                console.error("Error updating livekit video stream store", e);
            });
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(track.mediaStream);
            this._isMuted.set(track.isMuted);
            this.updateLivekitVideoStreamStore().catch((e) => {
                console.error("Error updating livekit video stream store", e);
            });
        } else if (publication.source === Track.Source.ScreenShare) {
            this._videoScreenShareStreamStore.set(track.mediaStream);

            this._screenShareRemoteTrack = track;

            const screenElements =
                this.space.spacePeerManager.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
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
            //TODO : tester les screenShareAudio
            this._audioScreenShareStreamStore.set(track.mediaStream);
            this.updateLivekitScreenShareStreamStore().catch(() => {
                console.error("Error updating livekit screen share stream store");
            });
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            // this.space.livekitVideoStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._videoRemoteTrack === track) {
                this._videoRemoteTrack = undefined;
                const videoElements =
                    this.space.spacePeerManager.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
                videoElements.forEach((videoElement) => {
                    track.detach(videoElement);
                    videoElement.remove();
                });
            }

            const oldVideoStream = this.space.allVideoStreamStore.get(this._spaceUser.spaceUserId);
            if (oldVideoStream) {
                this._streamableSubjects.videoPeerRemoved.next(oldVideoStream.media);
            }
        } else if (publication.source === Track.Source.ScreenShare) {
            // this.space.livekitScreenShareStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._screenShareRemoteTrack === track) {
                this._screenShareRemoteTrack = undefined;
                const screenElements =
                    this.space.spacePeerManager.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
                screenElements.forEach((screenElement) => {
                    track.detach(screenElement);
                    screenElement.remove();
                });
            }

            const oldScreenShareStream = this.space.allScreenShareStreamStore.get(this._spaceUser.spaceUserId);
            if (oldScreenShareStream) {
                this._streamableSubjects.screenSharingPeerRemoved.next(oldScreenShareStream.media);
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

    private listenToParticipantEvents() {
        this.participant.on(ParticipantEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
        this.participant.on(ParticipantEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
        this.participant.on(ParticipantEvent.TrackMuted, this.handleTrackMuted.bind(this));
        this.participant.on(ParticipantEvent.TrackUnmuted, this.handleTrackUnmuted.bind(this));
        this.participant.on(ParticipantEvent.ConnectionQualityChanged, this.handleConnectionQualityChanged.bind(this));
        this.participant.on(ParticipantEvent.IsSpeakingChanged, this.handleIsSpeakingChanged.bind(this));
    }

    private async updateLivekitVideoStreamStore() {
        const videoStream = await this.getVideoStream();
        const oldVideoStream = this.space.allVideoStreamStore.get(this._spaceUser.spaceUserId);

        if (oldVideoStream) {
            this._streamableSubjects.videoPeerRemoved.next(oldVideoStream.media);
        }

        this.space.allVideoStreamStore.set(this._spaceUser.spaceUserId, videoStream);

        this._streamableSubjects.videoPeerAdded.next(videoStream.media);
    }

    private async updateLivekitScreenShareStreamStore() {
        const screenShareStream = await this.getScreenShareStream();
        const oldScreenShareStream = this.space.allScreenShareStreamStore.get(this._spaceUser.spaceUserId);

        if (oldScreenShareStream) {
            this._streamableSubjects.screenSharingPeerRemoved.next(oldScreenShareStream.media);
        }

        this.space.allScreenShareStreamStore.set(this._spaceUser.spaceUserId, screenShareStream);

        this._streamableSubjects.screenSharingPeerAdded.next(screenShareStream.media);
    }

    public async getVideoStream(): Promise<ExtendedStreamable> {
        const player = await this._spaceUser.getPlayer();
        return {
            uniqueId: this.participant.identity,
            hasAudio: this._hasAudio,
            hasVideo: this._hasVideo,
            isMuted: this._isMuted,
            statusStore: writable("connected"),
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
                    const videoElements =
                        this.space.spacePeerManager.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
                    videoElements.push(container);
                    this.space.spacePeerManager.videoContainerMap.set(this._spaceUser.spaceUserId, videoElements);

                    if (this._videoRemoteTrack) {
                        this._videoRemoteTrack.attach(container);
                    }
                },
                detach: (container: HTMLVideoElement) => {
                    let videoElements =
                        this.space.spacePeerManager.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
                    videoElements = videoElements.filter((element) => element !== container);
                    this.space.spacePeerManager.videoContainerMap.set(this._spaceUser.spaceUserId, videoElements);

                    if (this._videoRemoteTrack) {
                        this._videoRemoteTrack.detach(container);
                    }
                },
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
            player,
            userId: this._spaceUser.userId,
            once(event, callback) {
                callback();
            },
        };
    }

    public async getScreenShareStream(): Promise<ExtendedStreamable> {
        const player = await this._spaceUser.getPlayer();
        const streamable: ExtendedStreamable = {
            uniqueId: this.participant.sid,
            hasAudio: writable(false),
            hasVideo: writable(true),
            isMuted: writable(false),
            statusStore: writable("connected"),
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
                    const screenElements =
                        this.space.spacePeerManager.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
                    screenElements.push(container);
                    this.space.spacePeerManager.screenShareContainerMap.set(
                        this._spaceUser.spaceUserId,
                        screenElements
                    );
                    if (this._screenShareRemoteTrack) {
                        this._screenShareRemoteTrack.attach(container);
                    }
                },
                detach: (container: HTMLVideoElement) => {
                    let screenElements =
                        this.space.spacePeerManager.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
                    screenElements = screenElements.filter((element) => element !== container);
                    this.space.spacePeerManager.screenShareContainerMap.set(
                        this._spaceUser.spaceUserId,
                        screenElements
                    );
                    if (this._screenShareRemoteTrack) {
                        this._screenShareRemoteTrack.detach(container);
                    }
                },
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
            player,
            userId: this._spaceUser.userId,
            once(event, callback) {
                callback();
            },
        };

        this.highlightedEmbedScreenStore.toggleHighlight(streamable);

        return streamable;
    }

    public setActiveSpeaker(isActiveSpeaker: boolean) {
        this._isActiveSpeaker.set(isActiveSpeaker);
    }

    public destroy() {
        // Clean up video elements

        const videoElements = this.space.spacePeerManager.videoContainerMap.get(this._spaceUser.spaceUserId) || [];
        videoElements.forEach((videoElement) => {
            this._videoRemoteTrack?.detach(videoElement);
        });

        const screenShareElements =
            this.space.spacePeerManager.screenShareContainerMap.get(this._spaceUser.spaceUserId) || [];
        screenShareElements.forEach((screenShareElement) => {
            this._screenShareRemoteTrack?.detach(screenShareElement);
        });

        this.participant.off(ParticipantEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
        this.participant.off(ParticipantEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
        this.participant.off(ParticipantEvent.TrackMuted, this.handleTrackMuted.bind(this));
        this.participant.off(ParticipantEvent.TrackUnmuted, this.handleTrackUnmuted.bind(this));
        this.participant.off(ParticipantEvent.ConnectionQualityChanged, this.handleConnectionQualityChanged.bind(this));
        this.participant.off(ParticipantEvent.IsSpeakingChanged, this.handleIsSpeakingChanged.bind(this));
    }
}
