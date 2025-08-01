import { MapStore } from "@workadventure/store-utils";
import { Participant, VideoPresets, Room, RoomEvent } from "livekit-client";
import { Unsubscriber } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { SpaceInterface } from "../Space/SpaceInterface";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { LiveKitParticipant } from "./LivekitParticipant";
import { LiveKitRoom } from "./LiveKitRoom";
export class LiveKitRoomWatch implements LiveKitRoom {
    private room: Room | undefined;
    private participants: MapStore<string, LiveKitParticipant> = new MapStore<string, LiveKitParticipant>();
    private unsubscribers: Unsubscriber[] = [];

    constructor(
        private serverUrl: string,
        private token: string,
        private space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects
    ) {}

    public async prepareConnection(): Promise<Room> {
        this.room = new Room({
            adaptiveStream: {
                pixelDensity: "screen",
            },
            dynacast: true,
            publishDefaults: {
                videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h90],
                videoCodec: "vp8",
            },
            videoCaptureDefaults: {
                resolution: VideoPresets.h720,
            },
        });

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

            await Promise.all(
                Array.from(room.remoteParticipants.values()).map(async (participant) => {
                    const id = this.getParticipantId(participant);

                    if (!participant.permissions?.canPublish) {
                        console.info("participant has no publish permission", id);
                        return;
                    }

                    const spaceUser = await this.space.getSpaceUserBySpaceUserId(id);
                    if (!spaceUser) {
                        console.error("spaceUser not found for participant", id);
                        return;
                    }
                    this.participants.set(
                        participant.sid,
                        new LiveKitParticipant(participant, this.space, spaceUser, this._streamableSubjects)
                    );
                })
            );
        } catch (err) {
            console.error("An error occurred in joinRoom", err);
            Sentry.captureException(err);
            return;
        }
    }

    private handleRoomEvents() {
        if (!this.room) {
            console.error("Room not found");
            Sentry.captureException(new Error("Room not found"));
            return;
        }

        this.room.on(RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this));
        this.room.on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected.bind(this));
        this.room.on(RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakersChanged.bind(this));
    }

    private getParticipantId(participant: Participant) {
        return participant.identity.split("@")[0];
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

    private handleParticipantConnected(participant: Participant) {
        const id = this.getParticipantId(participant);

        this.space
            .getSpaceUserBySpaceUserId(id)
            .then((spaceUser) => {
                if (!spaceUser) {
                    console.info("spaceUser not found for participant", id);
                    return;
                }

                this.participants.set(
                    participant.sid,
                    new LiveKitParticipant(participant, this.space, spaceUser, this._streamableSubjects)
                );
            })
            .catch((err) => {
                console.error("An error occurred in handleParticipantConnected", err);
                Sentry.captureException(err);
            });
    }

    private handleParticipantDisconnected(participant: Participant) {
        this.participants.delete(participant.sid);
    }

    private handleActiveSpeakersChanged(speakers: Participant[]) {
        //TODO : revoir impl iteration sur tout les participants a chaque fois
        this.participants.forEach((participant) => {
            if (speakers.map((speaker) => speaker.sid).includes(participant.participant.sid)) {
                participant.setActiveSpeaker(true);
            } else {
                participant.setActiveSpeaker(false);
            }
        });
    }

    public destroy() {
        this.unsubscribers.forEach((unsubscriber) => unsubscriber());
        this.participants.forEach((participant) => participant.destroy());
        this.room?.off(RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this));
        this.room?.off(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected.bind(this));
        this.room?.off(RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakersChanged.bind(this));
        this.leaveRoom();
    }
}
