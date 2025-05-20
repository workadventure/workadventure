import { MapStore } from "@workadventure/store-utils";
import { LocalParticipant, LocalVideoTrack, Participant, VideoPresets, Room, RoomEvent, Track } from "livekit-client";
import { get, Readable, Unsubscriber } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import {
    LocalStreamStoreValue,
    requestedMicrophoneDeviceIdStore,
    requestedCameraDeviceIdStore,
    requestedCameraState,
    requestedMicrophoneState,
    speakerSelectedStore,
} from "../Stores/MediaStore";
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
        //TODO : voir si on ne doit pas utiliser le requestedCameraIdStore a la place de requestedCameraState / meme chose pour le reste
        private cameraStateStore: Readable<boolean> = requestedCameraState,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
        private screenSharingLocalStreamStore: Readable<LocalStreamStoreValue> = screenSharingLocalStream,
        private cameraDeviceIdStore: Readable<string | undefined> = requestedCameraDeviceIdStore,
        private microphoneDeviceIdStore: Readable<string | undefined> = requestedMicrophoneDeviceIdStore,
        private speakerDeviceIdStore: Readable<string | undefined> = speakerSelectedStore
    ) {}

    public async prepareConnection(): Promise<Room> {
        //TODO : revoir les paramètres de la room
        this.room = new Room({
            adaptiveStream: {
                pixelDensity: "screen",
            },
            dynacast: true,
            publishDefaults: {
                videoSimulcastLayers: [VideoPresets.h720, VideoPresets.h360, VideoPresets.h90],
                videoCodec: "vp9",
            },
            videoCaptureDefaults: {
                resolution: VideoPresets.h1080,
            },
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
            await Promise.all(
                Array.from(room.remoteParticipants.values()).map((participant) => {
                    const id = this.getParticipantId(participant);
                    return this.space.getSpaceUserBySpaceUserId(id).then((spaceUser) => {
                        if (!spaceUser) {
                            console.error("spaceUser not found for participant", id);
                            return;
                        }
                        this.participants.set(
                            spaceUser.uuid,
                            new LiveKitParticipant(participant, this.space, spaceUser)
                        );
                    });
                })
            );
        } catch (err) {
            console.error("An error occurred in joinRoom", err);
            Sentry.captureException(err);
            return;
        }
    }

    private synchronizeMediaState() {
        this.unsubscribers.push(
            this.cameraStateStore.subscribe((state) => {
                console.log("cameraStateStore", state);

                //TODO : voir si on a la permission de partager l'ecran
                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }

                const deviceId = get(this.cameraDeviceIdStore);
                //TODO : voir si utile de subscribe directement au requestedCameraDeviceIdStore

                this.localParticipant
                    .setCameraEnabled(
                        state,
                        {
                            deviceId: deviceId,
                        },
                        {}
                    )
                    .catch((err) => {
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
                const deviceId = get(this.microphoneDeviceIdStore);
                this.localParticipant
                    .setMicrophoneEnabled(state, {
                        deviceId: deviceId,
                    })
                    .catch((err) => {
                        console.error("An error occurred in synchronizeMediaState", err);
                        Sentry.captureException(err);
                    });
            })
        );

        this.unsubscribers.push(
            this.screenSharingLocalStreamStore.subscribe((stream) => {
                const streamResult = stream.type === "success" ? stream.stream : undefined;

                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }
                if (this.localVideoTrack) {
                    this.unpublishAllScreenShareTrack().catch((err) => {
                        console.error("An error occurred while unpublishing all screen share track", err);
                        Sentry.captureException(err);
                    });
                }

                if (streamResult) {
                    // Create a new track instance
                    this.localVideoTrack = new LocalVideoTrack(streamResult.getVideoTracks()[0]);

                    this.localParticipant
                        .publishTrack(this.localVideoTrack, {
                            source: Track.Source.ScreenShare,
                        })
                        .catch((err) => {
                            console.error("An error occurred while publishing track", err);
                            Sentry.captureException(err);
                        });
                }
            })
        );

        this.unsubscribers.push(
            this.cameraDeviceIdStore.subscribe((deviceId) => {
                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }

                console.log("cameraDeviceIdStore", deviceId);
                const state = get(this.cameraStateStore);

                if (!state || !deviceId) return;

                this.room?.switchActiveDevice("videoinput", deviceId).catch((err) => {
                    console.error("An error occurred while switching active device", err);
                    Sentry.captureException(err);
                });
            })
        );
        //TODO : voir si on a besoin de set la sortie audio
        this.unsubscribers.push(
            this.microphoneDeviceIdStore.subscribe((deviceId) => {
                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }

                const state = get(this.microphoneStateStore);

                if (!state || !deviceId) return;

                this.room?.switchActiveDevice("audioinput", deviceId).catch((err) => {
                    console.error("An error occurred while switching active device", err);
                    Sentry.captureException(err);
                });
            })
        );

        this.unsubscribers.push(
            this.speakerDeviceIdStore.subscribe((deviceId) => {
                if (!deviceId) return;

                this.room?.switchActiveDevice("audiooutput", deviceId).catch((err) => {
                    console.error("An error occurred while switching active device", err);
                    Sentry.captureException(err);
                });
            })
        );
    }

    private async unpublishAllScreenShareTrack() {
        if (!this.localParticipant) {
            console.error("Local participant not found");
            Sentry.captureException(new Error("Local participant not found"));
            return;
        }

        await Promise.all(
            Array.from(this.localParticipant.trackPublications.values())
                .filter((publication) => publication.track && publication.source === "screen_share")
                .map(async (publication) => {
                    const track = publication.track;
                    if (track) {
                        await this.localParticipant?.unpublishTrack(track);
                        track.stop(); // Optional: stop the media track to release resources
                    }
                })
        );
    }
    private handleRoomEvents() {
        if (!this.room) {
            console.error("Room not found");
            Sentry.captureException(new Error("Room not found"));
            return;
        }

        this.room.on(RoomEvent.ParticipantConnected, (participant) => {
            const id = this.getParticipantId(participant);
            this.space
                .getSpaceUserBySpaceUserId(id)
                .then((spaceUser) => {
                    if (!spaceUser) {
                        console.log("spaceUser not found for participant", id);
                        return;
                    }
                    this.participants.set(participant.sid, new LiveKitParticipant(participant, this.space, spaceUser));
                })
                .catch((err) => {
                    console.error("An error occurred while getting spaceUser", err);
                    Sentry.captureException(err);
                });
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
