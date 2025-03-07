import { MapStore } from "@workadventure/store-utils";
import { LocalParticipant, LocalVideoTrack, Participant, VideoPresets, Room } from "livekit-client";
import { Unsubscriber } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { requestedCameraState, requestedMicrophoneState } from "../Stores/MediaStore";
import { SpaceInterface } from "../Space/SpaceInterface";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { LiveKitParticipant } from "./LivekitParticipant";
export class LiveKitRoom {
    private room: Room | undefined;
    private localParticipant: LocalParticipant | undefined;
    private participants: MapStore<string, LiveKitParticipant> = new MapStore<string, LiveKitParticipant>();
    private localVideoTrack: LocalVideoTrack | undefined;
    private unsubscribers: Unsubscriber[] = [];

    constructor(private serverUrl: string, private token: string, private space: SpaceInterface) {}

    public async prepareConnection(): Promise<Room> {
        //TODO : revoir les paramètres de la room
        this.room = new Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
                resolution: VideoPresets.h720.resolution,
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
            room.remoteParticipants.forEach((participant) => {
                const id = this.getParticipantId(participant);

                const spaceUser = this.space.getSpaceUserById(Number(id));

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
            requestedCameraState.subscribe((state) => {
                //TODO : voir si on a la permission de partager l'ecran
                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }

                this.localParticipant.setCameraEnabled(state).catch((err) => {
                    console.error("An error occurred in synchronizeMediaState", err);
                    Sentry.captureException(err);
                });
            })
        );

        this.unsubscribers.push(
            requestedMicrophoneState.subscribe((state) => {
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
            screenSharingLocalStreamStore.subscribe((stream) => {
                const streamResult = stream.type === "success" ? stream.stream : undefined;

                if (this.localVideoTrack) {
                    if (!this.localParticipant) {
                        console.error("Local participant not found");
                        Sentry.captureException(new Error("Local participant not found"));
                        return;
                    }

                    this.localParticipant.unpublishTrack(this.localVideoTrack).catch((err) => {
                        console.error("An error occurred in synchronizeMediaState", err);
                        Sentry.captureException(err);
                    });
                }

                if (streamResult) {
                    this.localVideoTrack = new LocalVideoTrack(streamResult.getVideoTracks()[0]);

                    if (!this.localParticipant) {
                        console.error("Local participant not found");
                        Sentry.captureException(new Error("Local participant not found"));
                        return;
                    }
                    this.localParticipant
                        .publishTrack(this.localVideoTrack, {
                            source: "screen_share",
                        })
                        .catch((err) => {
                            console.error("An error occurred in synchronizeMediaState", err);
                            Sentry.captureException(err);
                        });
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

        this.room.on("participantConnected", (participant) => {
            const id = this.getParticipantId(participant);
            const spaceUser = this.space.getSpaceUserById(Number(id));
            if (!spaceUser) {
                console.log("spaceUser not found for participant", id);
                return;
            }
            this.participants.set(participant.sid, new LiveKitParticipant(participant, this.space, spaceUser));
        });

        this.room.on("participantDisconnected", (participant) => {
            this.participants.delete(participant.sid);
        });
    }

    public getParticipantId(participant: Participant) {
        return participant.identity.split(":")[1];
    }

    public leaveRoom() {
        if (!this.room) {
            console.error("Room not found");
            Sentry.captureException(new Error("Room not found"));
            return;
        }

        this.room.disconnect(true).catch((err) => {
            console.error("An error occurred in leaveRoom", err);
            Sentry.captureException(err);
        });
    }

    public destroy() {
        this.unsubscribers.forEach((unsubscriber) => unsubscriber());
        this.leaveRoom();
    }
}
