import { MapStore } from "@workadventure/store-utils";
import {
    LocalParticipant,
    LocalVideoTrack,
    Participant,
    VideoPresets,
    Room,
    RoomEvent,
    Track,
    LocalTrack,
} from "livekit-client";
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
import { nbSoundPlayedInBubbleStore, INbSoundPlayedInBubbleStore } from "../Stores/ApparentMediaContraintStore";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { LiveKitParticipant } from "./LivekitParticipant";
export class LiveKitRoom {
    private room: Room | undefined;
    private localParticipant: LocalParticipant | undefined;
    private participants: MapStore<string, LiveKitParticipant> = new MapStore<string, LiveKitParticipant>();
    private localVideoTrack: LocalVideoTrack | undefined;
    private dispatchSoundTrack: LocalTrack | undefined;
    private unsubscribers: Unsubscriber[] = [];

    constructor(
        private serverUrl: string,
        private token: string,
        private space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private cameraStateStore: Readable<boolean> = requestedCameraState,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
        private screenSharingLocalStreamStore: Readable<LocalStreamStoreValue> = screenSharingLocalStream,
        private cameraDeviceIdStore: Readable<string | undefined> = requestedCameraDeviceIdStore,
        private microphoneDeviceIdStore: Readable<string | undefined> = requestedMicrophoneDeviceIdStore,
        private speakerDeviceIdStore: Readable<string | undefined> = speakerSelectedStore,
        private _nbSoundPlayedInBubbleStore: INbSoundPlayedInBubbleStore = nbSoundPlayedInBubbleStore
    ) {}

    public async prepareConnection(): Promise<Room> {
        //TODO : revoir les paramètres de la room
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
                            new LiveKitParticipant(participant, this.space, spaceUser, this._streamableSubjects)
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
                if (!this.localParticipant) {
                    console.error("Local participant not found");
                    Sentry.captureException(new Error("Local participant not found"));
                    return;
                }

                const deviceId = get(this.cameraDeviceIdStore);

                this.localParticipant
                    .setCameraEnabled(
                        state,
                        {
                            deviceId: deviceId,
                            resolution: VideoPresets.h720,
                        },
                        {
                            videoCodec: "vp8",
                            videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h90],
                        }
                    )
                    .catch((err) => {
                        console.error("An error occurred in synchronizeMediaState", err);
                        Sentry.captureException(err);
                    });
            })
        );

        this.unsubscribers.push(
            this.microphoneStateStore.subscribe((state) => {
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
                            videoCodec: "vp8",
                            simulcast: true,
                            videoSimulcastLayers: [VideoPresets.h1080, VideoPresets.h360, VideoPresets.h90],
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

                const state = get(this.cameraStateStore);

                if (!state || !deviceId) return;

                this.room?.switchActiveDevice("videoinput", deviceId).catch((err) => {
                    console.error("An error occurred while switching active device", err);
                    Sentry.captureException(err);
                });
            })
        );

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

        this.room.on(RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this));
        this.room.on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected.bind(this));
        this.room.on(RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakersChanged.bind(this));
    }

    public getParticipantId(participant: Participant) {
        return participant.identity;
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
                console.error("An error occurred while getting spaceUser", err);
                Sentry.captureException(err);
            });
    }

    private handleParticipantDisconnected(participant: Participant) {
        this.participants.delete(participant.sid);
    }

    private handleActiveSpeakersChanged(speakers: Participant[]) {
        //TODO : revoir impl iteration sur tout les participants a chaque fois
        console.log("active speakers", speakers);
        this.participants.forEach((participant) => {
            if (speakers.map((speaker) => speaker.sid).includes(participant.participant.sid)) {
                console.log("participant is active speaker", participant.participant.sid);
                participant.setActiveSpeaker(true);
            } else {
                console.log("participant is not active speaker", participant.participant.sid);
                participant.setActiveSpeaker(false);
            }
        });
    }

    //TODO : Tester la fonction
    public async dispatchSound(url: URL): Promise<void> {
        if (!this.localParticipant) {
            console.error("Local participant not found");
            Sentry.captureException(new Error("Local participant not found"));
            return;
        }

        const audioContext = new AudioContext();

        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const destination = audioContext.createMediaStreamDestination();
        const bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.start(0);
        bufferSource.connect(destination);

        if (this.dispatchSoundTrack) {
            await this.localParticipant.unpublishTrack(this.dispatchSoundTrack);
            this.dispatchSoundTrack = undefined;
        }

        const localTrack = await this.localParticipant.publishTrack(destination.stream.getAudioTracks()[0], {
            //TODO : unknown ou screenshareAudio ??
            source: Track.Source.Unknown,
        });

        this.dispatchSoundTrack = localTrack.track;

        bufferSource.onended = () => {
            this._nbSoundPlayedInBubbleStore.soundEnded();
            if (!this.dispatchSoundTrack || !this.localParticipant) return;

            this.localParticipant
                .unpublishTrack(this.dispatchSoundTrack)
                .then(() => {
                    this.dispatchSoundTrack = undefined;
                })
                .catch((err) => {
                    console.error("An error occurred while unpublishing track", err);
                    Sentry.captureException(err);
                });
        };

        this._nbSoundPlayedInBubbleStore.soundStarted();
    }

    //TODO : tester
    public async dispatchStream(mediaStream: MediaStream): Promise<void> {
        if (!this.localParticipant) {
            console.error("Local participant not found");
            Sentry.captureException(new Error("Local participant not found"));
            return;
        }

        const videoTrack = mediaStream.getVideoTracks()[0];
        if (!videoTrack) {
            console.error("No video track found in the media stream");
            Sentry.captureException(new Error("No video track found in the media stream"));
            return;
        }

        const localTrack = await this.localParticipant.publishTrack(videoTrack, {
            source: Track.Source.ScreenShare,
        });

        this.dispatchSoundTrack = localTrack.track;
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
