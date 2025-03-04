import { Room, RemoteParticipant, TrackPublication, LocalTrack, createLocalTracks, RoomEvent, LocalParticipant, Participant } from 'livekit-client';
import { MapStore } from '@workadventure/store-utils';

class LiveKitClient {
    private room: Room | undefined;
    private videoStreamStore = new MapStore<number, MediaStream>();
    private screenSharingStreamStore = new MapStore<number, MediaStream>();
    private localTracks: LocalTrack[] = [];
    private localParticipant: LocalParticipant | undefined;
    constructor(private serverUrl: string, private token: string, private roomName: string) {}

    async joinRoom() {
        try {
            this.room = new Room({
                adaptiveStream: true,
                dynacast: true,
                audioCaptureDefaults: {
                    echoCancellation: true,
                    voiceIsolation: true,
                    noiseSuppression: true,
                    sampleRate: 48000,
                    sampleSize: 16,
                }
            });

            await this.room.prepareConnection(this.serverUrl, this.token);

            // Connect to the room using the token and server URL
            await this.room.connect(this.token, this.serverUrl, {
                autoSubscribe: true,
                maxRetries: 3,
            });

            this.localParticipant = this.room.localParticipant;

            // Handle new participants joining the room
            this.room.on('participantConnected', (participant: RemoteParticipant) => {
                console.log(`Participant connected: ${participant.identity}`);
                this.subscribeToParticipantTracks(participant);
            });

            // Handle participant disconnection
            this.room.on('participantDisconnected', (participant: RemoteParticipant) => {
                console.log(`Participant disconnected: ${participant.identity}`);
                this.removeParticipantTracks(participant.identity);
            });

            // Handle track events
            this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);
                this.handleTrack(publication, participant.identity);
                
            });

            this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                console.log(`Track unsubscribed: ${track.kind} from ${participant.identity}`);
                this.removeTrack(publication, participant.identity);
            });

            this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
                console.log('Active speakers changed:', speakers);
                // Handle active speaker changes
            });

            this.room.on(RoomEvent.Disconnected, () => {
                console.log('Disconnected from room');
                this.cleanup();
            });

            this.room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
                console.log(`Local track unpublished: ${publication.trackName}`);
                // Handle local track unpublishing
            });

            console.log('Joined room:', this.roomName);

            // Start synchronizing media state
            this.synchronizeMediaState();
        } catch (error) {
            console.error('Failed to join room:', error);
        }
    }

    async publishTracks() {
        if (!this.room) {
            console.error('Cannot publish tracks: not connected to a room.');
            return;
        }

        try {
            this.localTracks = await createLocalTracks({
                audio: true,
                video: true,
            });

            this.localTracks.forEach((track) => {
                this.room?.localParticipant.publishTrack(track);
                if (track.kind === 'video') {
                    this.addStreamToStore(this.videoStreamStore, track.mediaStreamTrack, 0);
                } else if (track.kind === 'unknown') {
                    this.addStreamToStore(this.screenSharingStreamStore, track.mediaStreamTrack, 0);
                }
            });

            console.log('Published local tracks');
        } catch (error) {
            console.error('Failed to publish tracks:', error);
        }
    }

    private synchronizeMediaState(): void {
        requestedMicrophoneState.subscribe((state) => {
            const audioTrack = this.localTracks.find(track => track.kind === 'audio');
            if (audioTrack) {
                this.localParticipant?.setMicrophoneEnabled(state);
            }
        });

        requestedCameraState.subscribe((state) => {
            const videoTrack = this.localTracks.find(track => track.kind === 'video');
            if (videoTrack) {
                this.localParticipant?.setCameraEnabled(state);
            }
        });

        requestedScreenSharingState.subscribe((state) => {
            const screenTrack = this.localTracks.find(track => track.kind === 'unknown');
            if (screenTrack) {
                this.localParticipant?.setScreenShareEnabled(state);
            }
        });
    }

    private subscribeToParticipantTracks(participant: RemoteParticipant) {
        participant.on('trackPublished', (publication: TrackPublication) => {
            if (publication.isSubscribed) {
                this.handleTrack(publication, participant.identity);
            }
        });

        participant.tracks.forEach((publication) => {
            if (publication.isSubscribed) {
                this.handleTrack(publication, participant.identity);
            }
        });
    }

    private handleTrack(publication: TrackPublication, participantId: number) {
        if (publication.track && publication.track.kind === 'video') {
            this.addStreamToStore(this.videoStreamStore, publication.track.mediaStreamTrack, participantId);
        } else if (publication.track && publication.track.kind === 'unknown') {
            this.addStreamToStore(this.screenSharingStreamStore, publication.track.mediaStreamTrack, participantId);
        } else if (publication.track && publication.track.kind === 'audio') {
            const audioElement = document.createElement('audio');
            audioElement.srcObject = new MediaStream([publication.track.mediaStreamTrack]);
            audioElement.autoplay = true;
            document.body.appendChild(audioElement);
        }
    }

    private removeTrack(publication: TrackPublication, participantId: number) {
        if (publication.track && publication.track.kind === 'video') {
            this.videoStreamStore.delete(participantId);
        } else if (publication.track && publication.track.kind === 'unknown') {
            this.screenSharingStreamStore.delete(participantId);
        }
    }

    private removeParticipantTracks(participantId: number) {
        this.videoStreamStore.delete(participantId);
        this.screenSharingStreamStore.delete(participantId);
    }

    private addStreamToStore(store: MapStore<number, MediaStream>, mediaStreamTrack: MediaStreamTrack, participantId: number) {
        const newStream = new MediaStream([mediaStreamTrack]);
        store.set(participantId, newStream);
    }

    private cleanup() {
        this.videoStreamStore.clear();
        this.screenSharingStreamStore.clear();
    }

    // Expose video stream store
    get videoStream(): MapStore<number, MediaStream> {
        return this.videoStreamStore;
    }

    // Expose screen sharing stream store
    get screenSharingStream(): MapStore<number, MediaStream> {
        return this.screenSharingStreamStore;
    }
    handleTrackSubscribed(
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) {
        if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
          // attach it to a new HTMLVideoElement or HTMLAudioElement
          const element = track.attach();
          parentElement.appendChild(element);
        }
      }
      
    handleTrackUnsubscribed(
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) {
        // remove tracks from all attached elements
        track.detach();
      }
      
    handleLocalTrackUnpublished(
        publication: LocalTrackPublication,
        participant: LocalParticipant,
      ) {
        // when local tracks are ended, update UI to remove them from rendering
        publication.track.detach();
      }
      
    handleActiveSpeakerChange(speakers: Participant[]) {
        // show UI indicators when participant is speaking
      }
      
    handleDisconnect() {
        console.log('disconnected from room');
      }
}
