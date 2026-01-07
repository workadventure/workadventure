import { z } from "zod";
import { MapStore } from "@workadventure/store-utils";
import type { Participant, LocalParticipant } from "livekit-client";
import { VideoPresets, Room, RoomEvent, LocalVideoTrack, LocalAudioTrack, Track } from "livekit-client";
import type { Readable, Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import type { LocalStreamStoreValue } from "../Stores/MediaStore";
import { localStreamStore, speakerSelectedStore } from "../Stores/MediaStore";
import { screenSharingLocalStreamStore as screenSharingLocalStream } from "../Stores/ScreenSharingStore";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { SCREEN_SHARE_STARTING_PRIORITY, VIDEO_STARTING_PRIORITY } from "../Stores/StreamableCollectionStore";
import { decrementLivekitRoomCount, incrementLivekitRoomCount } from "../Utils/E2EHooks";
import { triggerReorderStore } from "../Stores/OrderedStreamableCollectionStore";
import { deriveSwitchStore } from "../Stores/InterruptorStore";
import { LiveKitParticipant } from "./LivekitParticipant";
import type { LiveKitRoomInterface } from "./LiveKitRoomInterface";

const ParticipantMetadataSchema = z.object({
    userId: z.string(),
});

type ParticipantMetadata = z.infer<typeof ParticipantMetadataSchema>;

type LivekitRoomCounter = {
    increment: () => void;
    decrement: () => void;
};

export class LiveKitRoom implements LiveKitRoomInterface {
    private room: Room | undefined;
    private participants: MapStore<string, LiveKitParticipant> = new MapStore<string, LiveKitParticipant>();
    private localParticipant: LocalParticipant | undefined;
    private localScreenSharingVideoTrack: LocalVideoTrack | undefined;
    private localScreenSharingAudioTrack: LocalAudioTrack | undefined;
    private localCameraTrack: LocalVideoTrack | undefined;
    private localMicrophoneTrack: LocalAudioTrack | undefined;
    private unsubscribers: Unsubscriber[] = [];

    constructor(
        private serverUrl: string,
        private token: string,
        private space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private abortSignal: AbortSignal,
        private screenSharingLocalStreamStore: Readable<LocalStreamStoreValue> = screenSharingLocalStream,
        private speakerDeviceIdStore: Readable<string | undefined> = speakerSelectedStore,
        private _livekitRoomCounter: LivekitRoomCounter = {
            increment: incrementLivekitRoomCount,
            decrement: decrementLivekitRoomCount,
        },
        private _localStreamStore: Readable<LocalStreamStoreValue> = localStreamStore
    ) {
        this._livekitRoomCounter.increment();
    }

    public async prepareConnection(): Promise<Room> {
        this.room = new Room({
            adaptiveStream: {
                pauseVideoInBackground: true,
            },
            dynacast: true,
            publishDefaults: {
                // Commented out: the default simulcast layers are sufficient for our use case
                // videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
                videoCodec: "vp8",
            },
            videoCaptureDefaults: {
                resolution: VideoPresets.h720,
            },
            stopLocalTrackOnUnpublish: false,
        });

        // Each track will subscribe to the room events like cleanup, so we want to be ready for a lot of listeners
        this.room.setMaxListeners(10000);

        this.localParticipant = this.room.localParticipant;

        await this.room.prepareConnection(this.serverUrl, this.token);

        return this.room;
    }

    private joinRoomCalled = false;

    public async joinRoom() {
        if (this.joinRoomCalled) {
            return;
        }
        if (this.abortSignal.aborted) {
            return;
        }
        this.joinRoomCalled = true;

        const room = this.room ?? (await this.prepareConnection());

        this.handleRoomEvents();
        await room.connect(this.serverUrl, this.token, {
            autoSubscribe: true,
        });
        if (this.abortSignal.aborted) {
            await room.disconnect();
            return;
        }

        this.synchronizeMediaState();

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
                new LiveKitParticipant(
                    participant,
                    this.space,
                    spaceUser,
                    this._streamableSubjects,
                    this._blockedUsersStore,
                    this.abortSignal
                )
            );
        });
    }

    /**
     * Publishes the microphone track to the room
     */
    private async publishMicrophoneTrack(audioTrack: LocalAudioTrack): Promise<void> {
        if (!this.localParticipant) {
            throw new Error("Local participant not found");
        }

        this.localMicrophoneTrack = audioTrack;

        await this.localParticipant.publishTrack(this.localMicrophoneTrack, {
            source: Track.Source.Microphone,
        });
    }

    private handleCameraTrack(localStream: LocalStreamStoreValue | undefined): void {
        if (localStream === undefined || localStream.type !== "success" || !localStream.stream) {
            this.unpublishCameraTrack().catch((err) => {
                console.error("An error occurred while unpublishing camera track", err);
                Sentry.captureException(err);
            });
            return;
        }

        const videoTrack = localStream.stream.getVideoTracks()[0];

        if (!videoTrack) {
            this.unpublishCameraTrack().catch((err) => {
                console.error("An error occurred while unpublishing camera track", err);
                Sentry.captureException(err);
            });
            return;
        }

        // Are we trying to publish the same track again?
        // Note: in practice, we never reach this point with the same track, because we get a new track
        // each time we stop and restart the camera.
        if (this.localCameraTrack && this.localCameraTrack.mediaStreamTrack.id === videoTrack.id) {
            if (this.localCameraTrack.isUpstreamPaused) {
                this.localCameraTrack.resumeUpstream().catch((err) => {
                    console.error("An error occurred while unmuting camera track", err);
                    Sentry.captureException(err);
                });
            }
            return;
        }

        if (!this.localParticipant) {
            throw new Error("Local participant not found");
        }

        if (!this.localCameraTrack) {
            this.localCameraTrack = new LocalVideoTrack(videoTrack);
            this.localParticipant
                .publishTrack(this.localCameraTrack, {
                    source: Track.Source.Camera,
                    videoCodec: "vp8",
                    simulcast: true,
                    // Commented out: the default simulcast layers are sufficient for our use case
                    //videoSimulcastLayers: [VideoPresets.h1080, VideoPresets.h360, VideoPresets.h216,  ],
                })
                .catch((err) => {
                    console.error("An error occurred while publishing camera track", err);
                    Sentry.captureException(err);
                });
        } else {
            this.localCameraTrack
                .replaceTrack(videoTrack, {
                    userProvidedTrack: true,
                })
                .catch((err) => {
                    console.error("An error occurred while replacing camera track", err);
                    Sentry.captureException(err);
                });
        }
    }

    private handleMicrophoneTrack(localStream: LocalStreamStoreValue | undefined): void {
        if (localStream === undefined || localStream.type !== "success" || !localStream.stream) {
            this.unpublishMicrophoneTrack().catch((err) => {
                console.error("An error occurred while unpublishing microphone track", err);
                Sentry.captureException(err);
            });
            return;
        }

        const audioTrack = localStream.stream.getAudioTracks()[0];

        if (!audioTrack) {
            this.unpublishMicrophoneTrack().catch((err) => {
                console.error("An error occurred while unpublishing microphone track", err);
                Sentry.captureException(err);
            });
            return;
        }

        // Are we trying to publish the same track again?
        // Note: in practice, we never reach this point with the same track, because we get a new track
        // each time we stop and restart the microphone.
        if (this.localMicrophoneTrack && this.localMicrophoneTrack.mediaStreamTrack.id === audioTrack.id) {
            if (this.localMicrophoneTrack.isUpstreamPaused) {
                this.localMicrophoneTrack.resumeUpstream().catch((err) => {
                    console.error("An error occurred while unmuting microphone track", err);
                    Sentry.captureException(err);
                });
            }
            return;
        }

        if (!this.localParticipant) {
            throw new Error("Local participant not found");
        }

        if (!this.localMicrophoneTrack) {
            this.localMicrophoneTrack = new LocalAudioTrack(audioTrack);

            this.localParticipant
                .publishTrack(this.localMicrophoneTrack, {
                    source: Track.Source.Microphone,
                })
                .catch((err) => {
                    console.error("An error occurred while publishing microphone track", err);
                    Sentry.captureException(err);
                });
        } else {
            this.localMicrophoneTrack
                .replaceTrack(audioTrack, {
                    userProvidedTrack: true,
                })
                .catch((err) => {
                    console.error("An error occurred while replacing microphone track", err);
                    Sentry.captureException(err);
                });
        }
    }

    private synchronizeMediaState() {
        this.unsubscribers.push(
            deriveSwitchStore(this._localStreamStore, this.space.isStreamingStore).subscribe((localStream) => {
                this.handleCameraTrack(localStream);
                this.handleMicrophoneTrack(localStream);
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
                if (this.localScreenSharingVideoTrack || this.localScreenSharingAudioTrack) {
                    this.unpublishAllScreenShareTrack().catch((err) => {
                        console.error("An error occurred while unpublishing all screen share track", err);
                        Sentry.captureException(err);
                    });
                }

                if (streamResult) {
                    // Create a new video track instance
                    const screenShareVideoTrack = streamResult.getVideoTracks()[0];
                    const screenShareAudioTrack = streamResult.getAudioTracks()[0];

                    if (!screenShareVideoTrack) {
                        return;
                    }

                    if (!this.localScreenSharingVideoTrack) {
                        this.localScreenSharingVideoTrack = new LocalVideoTrack(screenShareVideoTrack);

                        // Publish screen share track
                        this.localParticipant
                            .publishTrack(this.localScreenSharingVideoTrack, {
                                source: Track.Source.ScreenShare,
                                videoCodec: "vp8",
                                simulcast: true,
                                // Commented out: the default simulcast layers are sufficient for our use case
                                // videoSimulcastLayers: [VideoPresets.h90, VideoPresets.h360, VideoPresets.h1080],
                            })
                            .catch((err) => {
                                console.error("An error occurred while publishing screen share video track", err);
                                Sentry.captureException(err);
                            });
                    } else {
                        // Replace existing video track
                        this.localScreenSharingVideoTrack
                            .replaceTrack(screenShareVideoTrack, {
                                userProvidedTrack: true,
                            })
                            .catch((err) => {
                                console.error("An error occurred while replacing screen share video track", err);
                                Sentry.captureException(err);
                            });
                    }

                    // Publish audio track if available
                    if (screenShareAudioTrack) {
                        if (!this.localScreenSharingAudioTrack) {
                            this.localScreenSharingAudioTrack = new LocalAudioTrack(screenShareAudioTrack);

                            this.localParticipant
                                .publishTrack(this.localScreenSharingAudioTrack, {
                                    source: Track.Source.ScreenShareAudio,
                                })
                                .catch((err) => {
                                    console.error("An error occurred while publishing screen share audio track", err);
                                    Sentry.captureException(err);
                                });
                        } else {
                            this.localScreenSharingAudioTrack
                                .replaceTrack(screenShareAudioTrack, {
                                    userProvidedTrack: true,
                                })
                                .catch((err) => {
                                    console.error("An error occurred while replacing screen share audio track", err);
                                    Sentry.captureException(err);
                                });
                        }
                    } else {
                        // If there is no audio track in the new stream, unpublish the existing one
                        if (this.localScreenSharingAudioTrack) {
                            this.localScreenSharingAudioTrack.pauseUpstream().catch((err) => {
                                console.error("An error occurred while unpublishing screen share audio track", err);
                                Sentry.captureException(err);
                            });
                        }
                    }
                }
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

        // Unpublish both video and audio screen share tracks
        await Promise.all(
            Array.from(this.localParticipant.trackPublications.values())
                .filter(
                    (publication) =>
                        publication.track &&
                        (publication.source === Track.Source.ScreenShare ||
                            publication.source === Track.Source.ScreenShareAudio)
                )
                .map(async (publication) => {
                    const track = publication.track;
                    if (track) {
                        // Note: for some reason, unpublishing / publishing a new track causes memory leaks.
                        // Instead, we just pause the upstream of the track when unpublishing, and "replaceTrack" when publishing a new one.
                        // await this.localParticipant?.unpublishTrack(track, false);
                        await track.pauseUpstream();
                    }
                })
        );

        // Note: we don't clear local track references because of the memory leak issue mentioned above.
        // We need to keep them to be able to replace the tracks when publishing a new screen share.
        //this.localScreenSharingVideoTrack = undefined;
        //this.localScreenSharingAudioTrack = undefined;
    }

    /**
     * Unpublishes the current microphone track
     */
    private async unpublishMicrophoneTrack(): Promise<void> {
        if (!this.localParticipant) {
            return;
        }

        if (this.localMicrophoneTrack) {
            await this.localMicrophoneTrack.pauseUpstream();
            // Note: for some reason, unpublishing / publishing a new track causes memory leaks.
            // Instead, we just pause the upstream of the track when unpublishing, and "replaceTrack" when publishing a new one.
            // await this.localParticipant.unpublishTrack(this.localMicrophoneTrack, false);
            // this.localMicrophoneTrack = undefined;
        }
    }

    /**
     * Unpublishes the current camera track
     */
    private async unpublishCameraTrack(): Promise<void> {
        if (!this.localParticipant) {
            return;
        }

        if (this.localCameraTrack) {
            await this.localCameraTrack.pauseUpstream();
            // Note: for some reason, unpublishing / publishing a new track causes memory leaks.
            // Instead, we just pause the upstream of the track when unpublishing, and "replaceTrack" when publishing a new one.
            // await this.localParticipant?.unpublishTrack(this.localCameraTrack, false);
            // this.localCameraTrack = undefined;
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

    public async dispatchStream(mediaStream: MediaStream): Promise<void> {
        if (!this.localParticipant) {
            console.error("Local participant not found");
            Sentry.captureException(new Error("Local participant not found"));
            return;
        }

        const audioTrack = mediaStream.getAudioTracks()[0];
        if (!audioTrack) {
            console.error("No audio track found in the media stream");
            Sentry.captureException(new Error("No audio track found in the media stream"));
            return;
        }

        await this.localParticipant.publishTrack(audioTrack, {
            source: Track.Source.Microphone,
        });
    }

    private handleParticipantConnected(participant: Participant) {
        if (this.abortSignal.aborted) {
            return;
        }
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
            new LiveKitParticipant(
                participant,
                this.space,
                spaceUser,
                this._streamableSubjects,
                this._blockedUsersStore,
                this.abortSignal
            )
        );
    }

    private handleParticipantDisconnected(participant: Participant) {
        const localParticipant = this.participants.get(participant.sid);

        if (localParticipant) {
            localParticipant.destroy();
        } else {
            console.warn("localParticipant not found for participant");
        }

        this.participants.delete(participant.sid);
    }

    /**
     * A set of previous participant SIDs who were speaking
     */
    private previousSpeakers: Set<string> = new Set();

    private handleActiveSpeakersChanged(speakers: Participant[]) {
        let priority = 0;
        const speakersSet = new Set(speakers.map((s) => s.sid));

        //TODO: review implementation - iterating over all participants each time
        this.participants.forEach((participant) => {
            if (speakersSet.has(participant.participant.sid)) {
                participant.setActiveSpeaker(true);
            } else {
                participant.setActiveSpeaker(false);

                if (this.previousSpeakers.has(participant.participant.sid)) {
                    // If the participant was previously speaking but is not speaking anymore, we set it as recently spoken
                    const previousSpeakerVideoBox = this.space.allVideoStreamStore.get(
                        participant.participant.identity
                    );
                    if (previousSpeakerVideoBox) {
                        previousSpeakerVideoBox.lastSpeakTimestamp = Date.now();
                    }
                }
            }
        });

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
            // The current user is always displayed first, so we skip it
            if (this.space.mySpaceUserId === speaker.identity) {
                continue;
            }
            const extendedVideoStream = this.space.getVideoPeerVideoBox(speaker.identity);

            // If this is a video and not a screen share, we add 2000 to the priority
            if (!extendedVideoStream) {
                continue;
            }

            if (get(extendedVideoStream.streamable)?.displayMode === "cover") {
                extendedVideoStream.priority = priority + VIDEO_STARTING_PRIORITY;
            } else {
                extendedVideoStream.priority = priority + SCREEN_SHARE_STARTING_PRIORITY;
            }
            priority++;
        }

        // Let's trigger an update on the space's videoStreamStore to reorder the view
        // To do so, we just take the first element of the map and put it back in the store at the same key.
        if (get(triggerReorderStore) === 0) {
            triggerReorderStore.set(1);
        } else {
            triggerReorderStore.set(0);
        }

        this.previousSpeakers = speakersSet;
    }

    public destroy() {
        try {
            this.unsubscribers.forEach((unsubscriber) => unsubscriber());
            this.participants.forEach((participant) => participant.destroy());
            this.room?.off(RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this));
            this.room?.off(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected.bind(this));
            this.room?.off(RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakersChanged.bind(this));

            this.leaveRoom();
        } finally {
            this._livekitRoomCounter.decrement();
        }
    }
}
