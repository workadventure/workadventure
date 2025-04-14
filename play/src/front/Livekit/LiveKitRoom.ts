import { MapStore } from "@workadventure/store-utils";
import { LocalParticipant, LocalVideoTrack, Participant, VideoPresets, Room, RoomEvent, Track } from "livekit-client";
import { Readable, Unsubscriber } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { LocalStreamStoreValue, requestedCameraState, requestedMicrophoneState } from "../Stores/MediaStore";
import { screenSharingLocalStreamStore as screenSharingLocalStream } from "../Stores/ScreenSharingStore";
import { SpaceInterface } from "../Space/SpaceInterface";
import { LiveKitParticipant } from "./LivekitParticipant";
export class LiveKitRoom {
    private room: Room | undefined;
    private localParticipant: LocalParticipant | undefined;
    private participants: MapStore<string, LiveKitParticipant> = new MapStore<string, LiveKitParticipant>();
    private localVideoTrack: LocalVideoTrack | undefined;
    private unsubscribers: Unsubscriber[] = [];

    constructor(
        private serverUrl: string,
        private token: string,
        private space: SpaceInterface,
        private cameraStateStore: Readable<boolean> = requestedCameraState,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
        private screenSharingLocalStreamStore: Readable<LocalStreamStoreValue> = screenSharingLocalStream
    ) {}

    public async prepareConnection(): Promise<Room> {
        //TODO : revoir les paramètres de la room
        this.room = new Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
                resolution: VideoPresets.h2160.resolution,
            }
            
        });

        this.localParticipant = this.room.localParticipant;

        await this.room.prepareConnection(this.serverUrl, this.token);

        return this.room;
    }

    public async joinRoom() {
        let room: Room;

        try {
            room = this.room ?? (await this.prepareConnection());

            this.handleRoomEvents();
            await room.connect(this.serverUrl, this.token, {
                autoSubscribe: true,
            });

            this.synchronizeMediaState();
            room.remoteParticipants.forEach((participant) => {
                //TODO : revoir la fonction ==> spaceUser toujours undefined /mauvais
                const id = this.getParticipantId(participant);

                const spaceUser = this.space.getSpaceUserBySpaceUserId(id);

                if (!spaceUser) {
                    console.error("spaceUser not found for participant", id);
                    return;
                }

                this.participants.set(spaceUser.uuid, new LiveKitParticipant(participant, this.space, spaceUser));
            });
        } catch (err) {
            console.error("An error occurred in joinRoom", err);
            Sentry.captureException(err);
            return;
        }
    }

    private synchronizeMediaState() {
        this.unsubscribers.push(
            this.cameraStateStore.subscribe((state) => {
                //TODO : voir si on a la permission de partager l'ecran
                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }

                this.localParticipant.setCameraEnabled(state, {
                    //TODO : voir la résolution qu'on décide d'envoyer 
                    resolution: VideoPresets.h2160.resolution,
                
                }).catch((err) => {
                    console.error("An error occurred in synchronizeMediaState", err);
                    Sentry.captureException(err);
                });
            })
        );

        this.unsubscribers.push(
            this.microphoneStateStore.subscribe((state) => {
                //TODO : voir si on a la permission de partager l'ecran
                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }
                this.localParticipant.setMicrophoneEnabled(state).catch((err) => {
                    console.error("An error occurred in synchronizeMediaState", err);
                    Sentry.captureException(err);
                });
            })
        );

        this.unsubscribers.push(
            this.screenSharingLocalStreamStore.subscribe(async (stream) => {
                const streamResult = stream.type === "success" ? stream.stream : undefined;
                
                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }
                if (this.localVideoTrack) {
                    await this.unpublishAllScreenShareTrack();

                }

                if (streamResult) {
    
                        // Create a new track instance
                        this.localVideoTrack = new LocalVideoTrack(streamResult.getVideoTracks()[0]);
                        
                        const dimensions = await this.localVideoTrack.waitForDimensions();

                        this.localParticipant.publishTrack(this.localVideoTrack, {
                            source: Track.Source.ScreenShare
                        }).then(() => {
                            console.log(">>>>>>> publishTrack success");
                        }).catch((err) => {
                            console.error("An error occurred while publishing track", err);
                            Sentry.captureException(err);
                        });

                }
            })
        );
    }

    private async unpublishAllScreenShareTrack() {
        if (!this.localParticipant) {
            console.error("Local participant not found");
            Sentry.captureException(new Error("Local participant not found"));
            return;
        }
        
        for (const publication of this.localParticipant.trackPublications.values()) {
            const track = publication.track;
          
            // Optional: You can use naming or source tagging to distinguish screen sharing
            if (track && publication.source === 'screen_share') {
              await this.localParticipant.unpublishTrack(track);
              track.stop(); // Optional: stop the media track to release resources
            }
          }
    }
    private handleRoomEvents() {
        if (!this.room) {
            console.error("Room not found");
            Sentry.captureException(new Error("Room not found"));
            return;
        }

        this.room.on(RoomEvent.ParticipantConnected, (participant) => {
            const id = this.getParticipantId(participant);
            const spaceUser = this.space.getSpaceUserBySpaceUserId(id);
            if (!spaceUser) {
                console.log("spaceUser not found for participant", id);
                return;
            }
            this.participants.set(participant.sid, new LiveKitParticipant(participant, this.space, spaceUser));
        });
        this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
            this.participants.delete(participant.sid);
        });
    }

    public getParticipantId(participant: Participant) {
        //TODO : voir si on utilise pas le uuid si on peut supprimer la partie avant le ||
        return participant.identity.split("||")[1];
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

    public destroy() {
        console.log(">>>>> destroy LiveKitRoom");
        console.count("destroy LiveKitRoom");
        this.unsubscribers.forEach((unsubscriber) => unsubscriber());
        this.participants.forEach((participant) => participant.destroy());  
        this.leaveRoom();
    }
}
