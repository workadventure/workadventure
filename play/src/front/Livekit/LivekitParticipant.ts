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
import { derived, get, Writable, writable } from "svelte/store";
import { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
import {
    ExtendedStreamable,
    SCREEN_SHARE_STARTING_PRIORITY,
    VIDEO_STARTING_PRIORITY,
} from "../Stores/StreamableCollectionStore";
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
        private highlightedEmbedScreenStore = highlightedEmbedScreen
    ) {
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
                        this.space.spacePeerManager.getVideoContainers(this._spaceUser.spaceUserId) || [];
                    videoElements.forEach((videoElement) => {
                        videoElement.autoplay = true;
                        videoElement.playsInline = true;
                        videoElement.muted = track.isMuted;
                        track.attach(videoElement);
                    });

                    this.updateLivekitVideoStreamStore();
                } else if (publication.source === Track.Source.Microphone) {
                    this._audioStreamStore.set(track.mediaStream);

                    this._audioRemoteTrack = track as RemoteAudioTrack;
                    this._isMuted.set(track.isMuted);
                    const audioElements = this.space.spacePeerManager.getAudioContainers(this._spaceUser.spaceUserId);
                    audioElements.forEach((audioElement) => {
                        audioElement.autoplay = true;
                        audioElement.muted = track.isMuted;
                        track.attach(audioElement);
                    });
                    this.updateLivekitVideoStreamStore();
                } else if (publication.source === Track.Source.ScreenShare) {
                    this._videoScreenShareStreamStore.set(track.mediaStream);
                    const screenElements =
                        this.space.spacePeerManager.getScreenShareContainers(this._spaceUser.spaceUserId) || [];
                    screenElements.forEach((screenElement) => {
                        screenElement.autoplay = true;
                        screenElement.playsInline = true;
                        screenElement.muted = track.isMuted;
                        track.attach(screenElement);
                    });
                    this.updateLivekitScreenShareStreamStore();
                } else if (publication.source === Track.Source.ScreenShareAudio) {
                    this._audioScreenShareStreamStore.set(track.mediaStream);

                    const audioElements = this.space.spacePeerManager.getScreenShareAudioContainers(
                        this._spaceUser.spaceUserId
                    );
                    audioElements.forEach((audioElement) => {
                        audioElement.autoplay = true;
                        audioElement.muted = track.isMuted;
                        track.attach(audioElement);
                    });
                    this.updateLivekitScreenShareStreamStore();
                }
            }
        });
    }

    private handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            this._videoStreamStore.set(track.mediaStream);
            this._hasVideo.set(!track.isMuted);

            this._videoRemoteTrack = track as RemoteVideoTrack;

            this.space.spacePeerManager.getVideoContainers(this._spaceUser.spaceUserId)?.forEach((videoElement) => {
                videoElement.autoplay = true;
                videoElement.playsInline = true;
                videoElement.muted = track.isMuted;
                track.attach(videoElement);
            });

            this.updateLivekitVideoStreamStore();
        } else if (publication.source === Track.Source.Microphone) {
            this._audioStreamStore.set(track.mediaStream);
            this._isMuted.set(track.isMuted);

            this._audioRemoteTrack = track as RemoteAudioTrack;
            this.space.spacePeerManager.getAudioContainers(this._spaceUser.spaceUserId)?.forEach((audioElement) => {
                audioElement.autoplay = true;
                audioElement.muted = track.isMuted;
                track.attach(audioElement);
            });

            this.updateLivekitVideoStreamStore();
        } else if (publication.source === Track.Source.ScreenShare) {
            this._videoScreenShareStreamStore.set(track.mediaStream);

            this._screenShareRemoteTrack = track as RemoteVideoTrack;

            const screenElements =
                this.space.spacePeerManager.getScreenShareContainers(this._spaceUser.spaceUserId) || [];
            screenElements.forEach((screenElement) => {
                screenElement.autoplay = true;
                screenElement.playsInline = true;
                screenElement.muted = track.isMuted;
                track.attach(screenElement);
            });

            this.updateLivekitScreenShareStreamStore();
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            this._audioScreenShareStreamStore.set(track.mediaStream);

            this._screenShareAudioRemoteTrack = track as RemoteAudioTrack;

            const audioElements = this.space.spacePeerManager.getScreenShareAudioContainers(
                this._spaceUser.spaceUserId
            );
            audioElements.forEach((audioElement) => {
                audioElement.autoplay = true;
                audioElement.muted = track.isMuted;
                track.attach(audioElement);
            });

            this.updateLivekitScreenShareStreamStore();
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
        if (publication.source === Track.Source.Camera) {
            // this.space.livekitVideoStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._videoRemoteTrack === track) {
                this._videoRemoteTrack = undefined;
                const videoElements = this.space.spacePeerManager.getVideoContainers(this._spaceUser.spaceUserId) || [];
                videoElements.forEach((videoElement) => {
                    track.detach(videoElement);
                    // TODO: taking the liberty to comment this out. It seems weird to delete here in Javascript an HTML element that was not created by this code.
                    // Symmetry is important, if this code does not create the video element, it should not delete it.
                    //videoElement.remove();
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
                    this.space.spacePeerManager.getScreenShareContainers(this._spaceUser.spaceUserId) || [];
                screenElements.forEach((screenElement) => {
                    track.detach(screenElement);
                    // TODO: taking the liberty to comment this out. It seems weird to delete here in Javascript an HTML element that was not created by this code.
                    // Symmetry is important, if this code does not create the video element, it should not delete it.
                    //screenElement.remove();
                });
            }

            const oldScreenShareStream = this.space.allScreenShareStreamStore.get(this._spaceUser.spaceUserId);
            if (oldScreenShareStream) {
                this._streamableSubjects.screenSharingPeerRemoved.next(oldScreenShareStream.media);
            }
        } else if (publication.source === Track.Source.Microphone) {
            // this.space.livekitAudioStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._audioRemoteTrack === track) {
                this._audioRemoteTrack = undefined;
                const audioElements = this.space.spacePeerManager.getAudioContainers(this._spaceUser.spaceUserId) || [];
                audioElements.forEach((audioElement) => {
                    track.detach(audioElement);
                    // Symmetry is important, if this code does not create the video element, it should not delete it.
                    // TODO: Taking the liberty to comment this out. It seems weird to delete here in Javascript an HTML element that was not created by this code.
                    //audioElement.remove();
                });
            }

            // TODO: see what the this.space.allVideoStreamStore is about and if we need to remove the audio stream
        } else if (publication.source === Track.Source.ScreenShareAudio) {
            // this.space.livekitScreenShareAudioStreamStore.delete(this._spaceUser.spaceUserId);
            if (this._screenShareAudioRemoteTrack === track) {
                this._screenShareAudioRemoteTrack = undefined;
                const audioElements =
                    this.space.spacePeerManager.getScreenShareAudioContainers(this._spaceUser.spaceUserId) || [];
                audioElements.forEach((audioElement) => {
                    track.detach(audioElement);
                    // Symmetry is important, if this code does not create the video element, it should not delete it.
                    // TODO: Taking the liberty to comment this out. It seems weird to delete here in Javascript an HTML element that was not created by this code.
                    //audioElement.remove();
                });
            }

            /*const oldScreenShareStream = this.space.allScreenShareStreamStore.get(this._spaceUser.spaceUserId);
            if (oldScreenShareStream) {
                this._streamableSubjects.screenSharingPeerRemoved.next(oldScreenShareStream.media);
            }*/
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
        const videoStream = this.getVideoStream();
        const oldVideoStream = this.space.allVideoStreamStore.get(this._spaceUser.spaceUserId);

        if (oldVideoStream) {
            this._streamableSubjects.videoPeerRemoved.next(oldVideoStream.media);
        }

        this.space.allVideoStreamStore.set(this._spaceUser.spaceUserId, videoStream);

        this._streamableSubjects.videoPeerAdded.next(videoStream.media);
    }

    private updateLivekitScreenShareStreamStore() {
        const screenShareStream = this.getScreenShareStream();
        const oldScreenShareStream = this.space.allScreenShareStreamStore.get(this._spaceUser.spaceUserId);

        if (oldScreenShareStream) {
            this._streamableSubjects.screenSharingPeerRemoved.next(oldScreenShareStream.media);
        }

        this.space.allScreenShareStreamStore.set(this._spaceUser.spaceUserId, screenShareStream);

        this._streamableSubjects.screenSharingPeerAdded.next(screenShareStream.media);
    }

    public getVideoStream(): ExtendedStreamable {
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
                attachVideo: (container: HTMLVideoElement) => {
                    this.space.spacePeerManager.registerVideoContainer(this._spaceUser.spaceUserId, container);
                    if (this._videoRemoteTrack) {
                        this._videoRemoteTrack.attach(container);
                    }
                },
                detachVideo: (container: HTMLVideoElement) => {
                    this.space.spacePeerManager.unregisterVideoContainer(this._spaceUser.spaceUserId, container);
                    if (this._videoRemoteTrack) {
                        this._videoRemoteTrack.detach(container);
                    }
                },
                attachAudio: (container: HTMLAudioElement) => {
                    this.space.spacePeerManager.registerAudioContainer(this._spaceUser.spaceUserId, container);
                    if (this._audioRemoteTrack) {
                        this._audioRemoteTrack.attach(container);
                    }
                },
                detachAudio: (container: HTMLAudioElement) => {
                    this.space.spacePeerManager.unregisterAudioContainer(this._spaceUser.spaceUserId, container);
                    if (this._audioRemoteTrack) {
                        this._audioRemoteTrack.detach(container);
                    }
                },
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
            userId: this._spaceUser.userId,
            once(event, callback) {
                callback();
            },
            priority: VIDEO_STARTING_PRIORITY,
            lastSpeakTimestamp: this.lastSpeakTimestamp,
        };
    }

    public getScreenShareStream(): ExtendedStreamable {
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
                attachVideo: (container: HTMLVideoElement) => {
                    this.space.spacePeerManager.registerScreenShareContainer(this._spaceUser.spaceUserId, container);
                    if (this._screenShareRemoteTrack) {
                        this._screenShareRemoteTrack.attach(container);
                    }
                },
                detachVideo: (container: HTMLVideoElement) => {
                    this.space.spacePeerManager.unregisterScreenShareContainer(this._spaceUser.spaceUserId, container);
                    if (this._screenShareRemoteTrack) {
                        this._screenShareRemoteTrack.detach(container);
                    }
                },
                attachAudio: (container: HTMLAudioElement) => {
                    this.space.spacePeerManager.registerScreenShareAudioContainer(
                        this._spaceUser.spaceUserId,
                        container
                    );
                    if (this._screenShareAudioRemoteTrack) {
                        this._screenShareAudioRemoteTrack.attach(container);
                    }
                },
                detachAudio: (container: HTMLAudioElement) => {
                    this.space.spacePeerManager.unregisterScreenShareAudioContainer(
                        this._spaceUser.spaceUserId,
                        container
                    );
                    if (this._screenShareAudioRemoteTrack) {
                        this._screenShareAudioRemoteTrack.detach(container);
                    }
                },
            },
            pictureStore: writable(this._spaceUser?.getWokaBase64),
            volumeStore: writable(undefined),
            userId: this._spaceUser.userId,
            once(event, callback) {
                callback();
            },
            priority: SCREEN_SHARE_STARTING_PRIORITY,
        };

        this.highlightedEmbedScreenStore.toggleHighlight(streamable);

        return streamable;
    }

    public setActiveSpeaker(isActiveSpeaker: boolean) {
        if (get(this._isActiveSpeaker) === true && isActiveSpeaker === false) {
            this.lastSpeakTimestamp = Date.now();
        }
        this._isActiveSpeaker.set(isActiveSpeaker);
    }

    public destroy() {
        // Clean up video elements

        const videoElements = this.space.spacePeerManager.getVideoContainers(this._spaceUser.spaceUserId) || [];
        videoElements.forEach((videoElement) => {
            this._videoRemoteTrack?.detach(videoElement);
        });

        const screenShareElements =
            this.space.spacePeerManager.getScreenShareContainers(this._spaceUser.spaceUserId) || [];
        screenShareElements.forEach((screenShareElement) => {
            this._screenShareRemoteTrack?.detach(screenShareElement);
        });

        const audioElements = this.space.spacePeerManager.getAudioContainers(this._spaceUser.spaceUserId) || [];
        audioElements.forEach((audioElement) => {
            this._audioRemoteTrack?.detach(audioElement);
        });

        const screenShareAudioElements =
            this.space.spacePeerManager.getScreenShareAudioContainers(this._spaceUser.spaceUserId) || [];
        screenShareAudioElements.forEach((screenShareAudioElement) => {
            this._screenShareAudioRemoteTrack?.detach(screenShareAudioElement);
        });

        this.participant.off(ParticipantEvent.TrackSubscribed, this.boundHandleTrackSubscribed);
        this.participant.off(ParticipantEvent.TrackUnsubscribed, this.boundHandleTrackUnsubscribed);
        this.participant.off(ParticipantEvent.TrackMuted, this.boundHandleTrackMuted);
        this.participant.off(ParticipantEvent.TrackUnmuted, this.boundHandleTrackUnmuted);
        this.participant.off(ParticipantEvent.ConnectionQualityChanged, this.boundHandleConnectionQualityChanged);
        this.participant.off(ParticipantEvent.IsSpeakingChanged, this.boundHandleIsSpeakingChanged);
    }
}
