import { MapStore } from "@workadventure/store-utils";
import { Participant, VideoPresets, Room, RoomEvent } from "livekit-client";
import { Unsubscriber } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { z } from "zod";
import { SpaceInterface } from "../Space/SpaceInterface";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { SCREEN_SHARE_STARTING_PRIORITY, VIDEO_STARTING_PRIORITY } from "../Stores/StreamableCollectionStore";
import { LiveKitParticipant } from "./LivekitParticipant";
import { LiveKitRoom } from "./LiveKitRoom";

const ParticipantMetadataSchema = z.object({
    userId: z.string(),
});

type ParticipantMetadata = z.infer<typeof ParticipantMetadataSchema>;

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

            Array.from(room.remoteParticipants.values()).map((participant) => {
                const id = this.getParticipantId(participant);
                if (!participant.permissions?.canPublish) {
                    console.info("participant has no publish permission", id);
                    return;
                }

                const spaceUser = this.space.getSpaceUserBySpaceUserId(id);
                if (!spaceUser) {
                    console.error("spaceUser not found for participant", id);
                    return;
                }

                if (spaceUser.spaceUserId === this.space.mySpaceUserId) {
                    return;
                }

                this.participants.set(
                    participant.sid,
                    new LiveKitParticipant(participant, this.space, spaceUser, this._streamableSubjects)
                );
            });
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

    private parseParticipantMetadata(participant: Participant): ParticipantMetadata {
        if (!participant.metadata) {
            throw new Error("Participant metadata is undefined");
        }
        try {
            const rawMetadata = JSON.parse(participant.metadata);
            return ParticipantMetadataSchema.parse(rawMetadata);
        } catch (error) {
            console.error("Failed to parse participant metadata:", error);
            Sentry.captureException(error);
            throw new Error("Invalid participant metadata", { cause: error });
        }
    }

    private getParticipantId(participant: Participant): string {
        const metadata = this.parseParticipantMetadata(participant);
        return metadata.userId;
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

        const spaceUser = this.space.getSpaceUserBySpaceUserId(id);

        if (!spaceUser) {
            console.info("spaceUser not found for participant", id);
            return;
        }

        if (spaceUser.spaceUserId === this.space.mySpaceUserId) {
            return;
        }

        this.participants.set(
            participant.sid,
            new LiveKitParticipant(participant, this.space, spaceUser, this._streamableSubjects)
        );
    }

    private handleParticipantDisconnected(participant: Participant) {
        this.participants.delete(participant.sid);
    }

    private handleActiveSpeakersChanged(speakers: Participant[]) {
        let priority = 0;

        // Let's reset the priority of the participant
        for (const videoStream of this.space.allVideoStreamStore.values()) {
            const lastSpeakTimestamp = videoStream.lastSpeakTimestamp;
            let bonusPriority = 0;
            if (lastSpeakTimestamp) {
                // If a participant has spoken but is not speaking anymore, we give a bonus priority based on the time since the last speak.
                const lastTimeSinceLastSpeak = Date.now() - lastSpeakTimestamp;
                // The bonus priority is calculated based on the time since the last speak and cannot be greater than 100.
                bonusPriority = 100 * Math.exp(-lastTimeSinceLastSpeak / 100000);
            }
            videoStream.priority = VIDEO_STARTING_PRIORITY + 9999 - bonusPriority;
        }

        for (const speaker of speakers) {
            const extendedVideoStream = this.space.allVideoStreamStore.get(speaker.identity);
            if (extendedVideoStream) {
                // If this is a video and not a screen share, we add 2000 to the priority
                if (extendedVideoStream.displayMode === "cover") {
                    extendedVideoStream.priority = priority + VIDEO_STARTING_PRIORITY;
                } else {
                    extendedVideoStream.priority = priority + SCREEN_SHARE_STARTING_PRIORITY;
                }
            }
            priority++;
        }

        // Let's trigger an update one the space's videoStreamStore to reorder the view
        // To do so, we just take the first element of the map and put it back in the store at the same key.
        const firstEntry = this.space.allVideoStreamStore.entries().next();
        if (!firstEntry.done) {
            const [key, value] = firstEntry.value;
            this.space.allVideoStreamStore.set(key, value);
        }

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
