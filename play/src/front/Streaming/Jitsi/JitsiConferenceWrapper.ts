// eslint-disable @typescript-eslint/ban-ts-comment
import { get, Readable, Unsubscriber, Writable, writable } from "svelte/store";

import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";

import JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";

import JitsiConference from "lib-jitsi-meet/types/hand-crafted/JitsiConference";
import Debug from "debug";

import JitsiLocalTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiLocalTrack";

import { JitsiConferenceErrors } from "lib-jitsi-meet/types/hand-crafted/JitsiConferenceErrors";
import { TurnCredentialsAnswer } from "@workadventure/messages";
import { asError } from "catch-unknown";
import {
    requestedCameraDeviceIdStore,
    requestedCameraState,
    requestedMicrophoneDeviceIdStore,
    requestedMicrophoneState,
    usedCameraDeviceIdStore,
    usedMicrophoneDeviceIdStore,
    videoConstraintStore,
} from "../../Stores/MediaStore";
import { liveStreamingEnabledStore } from "../../Stores/MegaphoneStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { DeviceBroadcastable } from "../Common/ConferenceWrapper";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import { getIceServersConfig } from "../../Components/Video/utils";
import { screenWakeLock } from "../../Utils/ScreenWakeLock";
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";
import { JitsiLocalTracks } from "./JitsiLocalTracks";

const debug = Debug("JitsiConferenceWrapper");

const JITSI_MIN_RESOLUTION = 180;
//const JITSI_MOZAIK_RESOLUTION = 360;
//const JITSI_MAX_RESOLUTION = 720;

//const JITSI_PRESENTATION_LASTN = 10;
//const JITSI_MOZAIC_LASTN = 4;

export class JitsiConferenceWrapper {
    private myParticipantId: string | undefined;
    private _streamStore: Writable<Map<string, JitsiTrackWrapper>>;

    private readonly _broadcastDevicesStore: Writable<DeviceBroadcastable[]>;

    private requestedCameraStateUnsubscriber: Unsubscriber | undefined;
    private requestedMicrophoneStateUnsubscriber: Unsubscriber | undefined;
    private cameraDeviceIdStoreUnsubscriber: Unsubscriber | undefined;
    private microphoneDeviceIdStoreUnsubscriber: Unsubscriber | undefined;
    private requestedScreenSharingStateUnsubscriber: Unsubscriber | undefined;
    private cameraDeviceId: string | undefined = undefined;
    private microphoneDeviceId: string | undefined = undefined;

    private audioTrackInterval: NodeJS.Timeout | undefined;
    private lastSentTalkingState = false;

    private tracks: JitsiLocalTracks = {
        audio: undefined,
        video: undefined,
        screenSharing: undefined,
    };

    private firstLocalTrackInitialized = false;

    private megaphoneEnabledUnsubscribe: Unsubscriber;
    private screenWakeRelease: (() => Promise<void>) | undefined;

    constructor(private jitsiConference: JitsiConference, public readonly jitsiRoomName: string) {
        this._streamStore = writable<Map<string, JitsiTrackWrapper>>(new Map<string, JitsiTrackWrapper>());
        this._broadcastDevicesStore = writable<DeviceBroadcastable[]>([]);

        this.megaphoneEnabledUnsubscribe = liveStreamingEnabledStore.subscribe((megaphoneEnabled) => {
            if (megaphoneEnabled) {
                this.broadcast(["video", "audio"]);
            } else {
                this.broadcast([]);
            }
        });
    }

    public static join(
        connection: JitsiConnection,
        jitsiRoomName: string,
        turnCredentials: TurnCredentialsAnswer
    ): Promise<JitsiConferenceWrapper> {
        return new Promise((resolve, reject) => {
            const iceTurnServer = getIceServersConfig(turnCredentials);
            const JitsiMeetJS = window.JitsiMeetJS;
            const room = connection.initJitsiConference(jitsiRoomName, {
                avgRtpStatsN: 4,
                channelLastN: 4,
                p2p: {
                    enable: true,
                    stunServers: iceTurnServer,
                    backToP2PDelay: 10000,
                    //codecPreferenceOrder - Provides a way to set the codec preference on desktop based endpoints.
                    //mobileCodecPreferenceOrder - Provides a way to set the codec preference on mobile devices, both on RN and mobile browser based endpoints.
                },
            });

            // To start the conference, we define the minim video quality
            room.setReceiverVideoConstraint(JITSI_MIN_RESOLUTION);
            room.setSenderVideoConstraint(JITSI_MIN_RESOLUTION).catch((e) => debug("setSenderVideoConstraint", e));
            //room.setLastN(JITSI_MOZAIC_LASTN);

            const jitsiConferenceWrapper = new JitsiConferenceWrapper(room, jitsiRoomName);

            screenWakeLock
                .requestWakeLock()
                .then((release) => {
                    jitsiConferenceWrapper.screenWakeRelease = release;
                })
                .catch((error) => console.error(error));

            //let isJoined = false;
            //const localTracks: any[] = [];
            room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
                debug("CONFERENCE_JOINED");
                jitsiConferenceWrapper.firstLocalTrackInit().catch((e) => {
                    console.error(e);
                });
                resolve(jitsiConferenceWrapper);
            });
            room.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, (e) => {
                reject(asError(e));
                console.error("conference failed");
            });
            room.on(JitsiMeetJS.events.conference.CONNECTION_ESTABLISHED, () => {
                debug("CONNECTION_ESTABLISHED");
            });
            room.on(JitsiMeetJS.events.conference.CONNECTION_INTERRUPTED, () => {
                console.error("CONNECTION_INTERRUPTED");
            });
            room.on(JitsiMeetJS.events.conference.CONNECTION_RESTORED, () => {
                debug("CONNECTION_RESTORED");
            });

            jitsiConferenceWrapper.requestedCameraStateUnsubscriber = requestedCameraState.subscribe(
                (requestedCameraState_) => {
                    if (jitsiConferenceWrapper.firstLocalTrackInitialized) {
                        if (
                            (jitsiConferenceWrapper.tracks.video && !requestedCameraState_) ||
                            (!jitsiConferenceWrapper.tracks.video && requestedCameraState_)
                        ) {
                            (async (): Promise<JitsiLocalTracks> =>
                                jitsiConferenceWrapper.handleLocalTrackState("video", requestedCameraState_))()
                                .then((newTracks) => {
                                    debug("requestedCameraState => subscribe => localTrack added");
                                })
                                .catch((e) => {
                                    requestedCameraState.disableWebcam();
                                    console.error("jitsiLocalTracks", e);
                                });
                        }
                    }
                }
            );

            jitsiConferenceWrapper.requestedMicrophoneStateUnsubscriber = requestedMicrophoneState.subscribe(
                (requestedMicrophoneState_) => {
                    if (jitsiConferenceWrapper.firstLocalTrackInitialized) {
                        if (
                            (jitsiConferenceWrapper.tracks.audio && !requestedMicrophoneState_) ||
                            (!jitsiConferenceWrapper.tracks.audio && requestedMicrophoneState_)
                        ) {
                            (async (): Promise<JitsiLocalTracks> =>
                                jitsiConferenceWrapper.handleLocalTrackState("audio", requestedMicrophoneState_))()
                                .then((newTracks) => {
                                    debug("requestedMicrophoneState => subscribe => localTrack added");
                                })
                                .catch((e) => {
                                    requestedMicrophoneState.disableMicrophone();
                                    console.error("jitsiLocalTracks", e);
                                });
                        }
                    }
                }
            );

            jitsiConferenceWrapper.cameraDeviceIdStoreUnsubscriber = requestedCameraDeviceIdStore.subscribe(
                (cameraDeviceId) => {
                    if (
                        jitsiConferenceWrapper.firstLocalTrackInitialized &&
                        cameraDeviceId !== jitsiConferenceWrapper.cameraDeviceId
                    ) {
                        jitsiConferenceWrapper
                            .handleLocalTrackState("video", true)
                            .then((newTracks) => {
                                debug("requestedCameraDeviceIdStore => subscribe => localTrack added");
                            })
                            .catch((e) => {
                                console.error("jitsiLocalTracks", e);
                            });
                    }
                }
            );

            jitsiConferenceWrapper.microphoneDeviceIdStoreUnsubscriber = requestedMicrophoneDeviceIdStore.subscribe(
                (microphoneDeviceId) => {
                    if (
                        jitsiConferenceWrapper.firstLocalTrackInitialized &&
                        microphoneDeviceId !== jitsiConferenceWrapper.microphoneDeviceId
                    ) {
                        jitsiConferenceWrapper
                            .handleLocalTrackState("audio", true)
                            .then((newTracks) => {
                                debug("requestedMicrophoneDeviceIdStore => subscribe => localTrack added");
                            })
                            .catch((e) => {
                                console.error("jitsiLocalTracks", e);
                            });
                    }
                }
            );

            jitsiConferenceWrapper.requestedScreenSharingStateUnsubscriber = requestedScreenSharingState.subscribe(
                (requestedScreenSharingState_) => {
                    if (jitsiConferenceWrapper.firstLocalTrackInitialized) {
                        if (
                            (jitsiConferenceWrapper.tracks.screenSharing && !requestedScreenSharingState_) ||
                            (!jitsiConferenceWrapper.tracks.screenSharing && requestedScreenSharingState_)
                        ) {
                            (async (): Promise<JitsiLocalTracks> =>
                                jitsiConferenceWrapper.handleLocalTrackState("desktop", requestedScreenSharingState_))()
                                .then((newTracks) => {
                                    debug("requestedScreenSharingState => subscribe => localTrack changed");
                                })
                                .catch((e) => {
                                    requestedScreenSharingState.disableScreenSharing();
                                    console.error("jitsiLocalTracks", e);
                                });
                        }
                    }
                }
            );

            /**
             * Handles remote tracks
             * @param track JitsiTrackWrapper object
             */
            function onRemoteTrack(track: JitsiTrack) {
                if (track.isLocal()) {
                    debug("Received my remote track", track);
                }

                debug("JitsiConferenceWrapper => onRemoteTrack");

                jitsiConferenceWrapper.addRemoteTrack(track, false);

                /*track.addEventListener(
                    JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                    audioLevel => debug(`Audio Level remote: ${audioLevel}`));*/
                track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, (event) => {
                    debug("track state changed");
                    jitsiConferenceWrapper.trackStateChanged(track);
                });
                track.addEventListener(JitsiMeetJS.events.track.NO_DATA_FROM_SOURCE, (event) => {
                    debug("track no data from source");
                });
                track.addEventListener(JitsiMeetJS.events.track.TRACK_VIDEOTYPE_CHANGED, (event) => {
                    debug("track video type changed");
                });
                track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, (track: JitsiTrack) => {
                    // TODO : Remove track that is stopped and update all other users
                    debug("local track stopped", track);

                    if (track.isVideoTrack() && track.getVideoType() === "desktop") {
                        requestedScreenSharingState.disableScreenSharing();
                    }
                });
                track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED, (deviceId) =>
                    debug(`track audio output device was changed to ${deviceId}`)
                );
            }

            room.on(JitsiMeetJS.events.conference.TRACK_ADDED, (track) => {
                debug(`remote ${track.type} track added`);
                onRemoteTrack(track);
            });
            room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
                debug(`remote ${track.type} track removed`);
                jitsiConferenceWrapper.removeRemoteTrack(track);
            });
            room.on(JitsiMeetJS.events.conference.USER_LEFT, (id) => {
                jitsiConferenceWrapper.removeUser(id);
            });
            room.on(JitsiMeetJS.events.conference.USER_JOINED, (id) => {
                debug("user joined: ", id);
                jitsiConferenceWrapper.addUser(id);
            });
            room.on(JitsiMeetJS.events.conference.P2P_STATUS, (status) => {
                debug("Conference P2P Status: ", status);
            });
            /*room.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
            room.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, track => {
                debug(`${track.getType()} - ${track.isMuted()}`);
            });
            room.on(
                JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
                (userID, displayName) => debug(`${userID} - ${displayName}`));
            room.on(
                JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
                (userID, audioLevel) => debug(`${userID} - ${audioLevel}`));
            room.on(
                JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED,
                () => debug(`${room.getPhoneNumber()} - ${room.getPhonePin()}`));*/
            jitsiConferenceWrapper.myParticipantId = room.myUserId();
            room.join("");

            // send notification that the user joined the conference
            notificationPlayingStore.playNotification(jitsiRoomName, "jitsi.png", jitsiRoomName);
        });
    }

    public broadcast(devices: DeviceBroadcastable[]) {
        this._broadcastDevicesStore.set(devices);
        //        await this.firstLocalTrackInit();
    }

    public async leave(reason?: string): Promise<void> {
        debug("JitsiConferenceWrapper => leaving ...");

        requestedScreenSharingState.disableScreenSharing();

        if (this.requestedMicrophoneStateUnsubscriber) {
            this.requestedMicrophoneStateUnsubscriber();
        }
        if (this.requestedCameraStateUnsubscriber) {
            this.requestedCameraStateUnsubscriber();
        }
        if (this.microphoneDeviceIdStoreUnsubscriber) {
            this.microphoneDeviceIdStoreUnsubscriber();
        }
        if (this.cameraDeviceIdStoreUnsubscriber) {
            this.cameraDeviceIdStoreUnsubscriber();
        }
        if (this.requestedScreenSharingStateUnsubscriber) {
            this.requestedScreenSharingStateUnsubscriber();
        }

        await this.jitsiConference.leave(reason).then(async () => {
            if (this.tracks.audio) {
                await this.handleTrack(this.tracks.audio, undefined);
            }
            if (this.tracks.video) {
                await this.handleTrack(this.tracks.video, undefined);
            }
            if (this.tracks.screenSharing) {
                await this.handleTrack(this.tracks.screenSharing, undefined);
            }
        });

        // jitsiConference.leave should trigger a "user" left event for every user.
        // still, the event is not triggered for the local user.
        this._streamStore.update((tracks) => {
            tracks.forEach((track) => {
                track.unsubscribe();
            });
            return new Map<string, JitsiTrackWrapper>();
        });

        this.megaphoneEnabledUnsubscribe();
        // Remove notification for this room
        notificationPlayingStore.removeNotificationById(this.jitsiRoomName);

        if (this.screenWakeRelease) {
            this.screenWakeRelease()
                .then(() => {
                    this.screenWakeRelease = undefined;
                })
                .catch((error) => console.error(error));
        }
    }

    private async createLocalTracks(types: DeviceBroadcastable[]): Promise<JitsiLocalTrack[]> {
        this.cameraDeviceId = get(requestedCameraDeviceIdStore);
        this.microphoneDeviceId = get(requestedMicrophoneDeviceIdStore);

        const videoConstraints = get(videoConstraintStore);

        const newTracks = await window.JitsiMeetJS.createLocalTracks({
            devices: types,
            cameraDeviceId: this.cameraDeviceId,
            micDeviceId: this.microphoneDeviceId,
            resolution: `${JITSI_MIN_RESOLUTION}`,
            constraints: {
                video: videoConstraints,
            },
        });
        const tracksReturned: JitsiLocalTrack[] = [];
        if (!(newTracks instanceof Array)) {
            // newTracks is a JitsiConferenceError
            throw asError(newTracks);
        } else {
            for (const track of newTracks) {
                if (track.isVideoTrack()) {
                    // if the type is desktop, cannot be set device camera id
                    if (types[0] != "desktop") {
                        usedCameraDeviceIdStore.set(track.getDeviceId());
                    }
                    tracksReturned.push(track);
                } else if (track.isAudioTrack()) {
                    // if the type is desktop, cannot be set device microphone id
                    if (types[0] != "desktop") {
                        usedMicrophoneDeviceIdStore.set(track.getDeviceId());
                        tracksReturned.push(track);
                    } else {
                        // if the type is desktop, cannot be use audio track for screen sharing
                        track
                            .dispose()
                            .catch((e) => console.error("jitsiLocalTracks error when we try to dispose it!", e));
                    }
                }
            }
        }
        return tracksReturned;
    }

    private async handleTrack(oldTrack: JitsiLocalTrack | undefined, track: JitsiLocalTrack | undefined) {
        const getType = (track: JitsiLocalTrack) => (track.isAudioTrack() ? "audio" : track.getVideoType());
        if (oldTrack && track) {
            debug(`REPLACING LOCAL ${getType(oldTrack)} TRACK`);
            await this.jitsiConference.replaceTrack(oldTrack, track);
            if (track.isAudioTrack()) {
                this.trackVolumeLocalAudioTrack(track.getOriginalStream());
            }
        } else if (oldTrack && !track) {
            debug(`REMOVING LOCAL ${getType(oldTrack)} TRACK`);
            await oldTrack.dispose();
            if (oldTrack.isAudioTrack()) {
                this.trackVolumeLocalAudioTrack(undefined);
            }
            //room.removeTrack(oldTrack);
            //await oldTrack.dispose();
        } else if (!oldTrack && track) {
            debug(`ADDING LOCAL ${getType(track)} TRACK`);
            await this.jitsiConference.addTrack(track);
            if (track.isAudioTrack()) {
                this.trackVolumeLocalAudioTrack(track.getOriginalStream());
            }
        }
    }

    private async firstLocalTrackInit() {
        debug("JitsiConferenceWrapper => firstLocalTrackInit");
        if (get(liveStreamingEnabledStore)) {
            const requestedDevices: DeviceBroadcastable[] = [];
            if (get(requestedCameraState)) {
                requestedDevices.push("video");
            }
            if (get(requestedMicrophoneState)) {
                requestedDevices.push("audio");
            }
            if (get(requestedScreenSharingState)) {
                requestedDevices.push("desktop");
            }
            let newTracks: JitsiLocalTrack[] | JitsiConferenceErrors = [];
            if (requestedDevices.length > 0) {
                newTracks = await this.createLocalTracks(requestedDevices);
            }

            if (requestedDevices.length > 0) {
                const promises: Promise<void>[] = [];
                for (const track of newTracks) {
                    if (track.isAudioTrack()) {
                        promises.push(
                            this.handleTrack(this.tracks.audio, track).then(() => {
                                this.tracks.audio = track;
                            })
                        );
                    } else if (track.isVideoTrack()) {
                        if (track.getVideoType() === "desktop") {
                            promises.push(
                                this.handleTrack(this.tracks.screenSharing, track).then(() => {
                                    this.tracks.screenSharing = track;
                                })
                            );
                        } else {
                            promises.push(
                                this.handleTrack(this.tracks.video, track).then(() => {
                                    this.tracks.video = track;
                                })
                            );
                        }
                    }
                }
                await Promise.all(promises);
            }
            debug("JitsiConferenceWrapper => handleFirstLocalTrack => success");
            this.firstLocalTrackInitialized = true;
        }
    }

    private async handleLocalTrackState(type: DeviceBroadcastable, state: boolean) {
        debug("JitsiConferenceWrapper => handleLocalTrackState", type, state);
        let newTrack: JitsiLocalTrack | undefined = undefined;
        if (state) {
            newTrack = (await this.createLocalTracks([type]))[0];
        }

        switch (type) {
            case "audio": {
                await this.handleTrack(this.tracks.audio, newTrack);
                this.tracks.audio = newTrack;
                break;
            }
            case "video": {
                await this.handleTrack(this.tracks.video, newTrack);
                this.tracks.video = newTrack;
                break;
            }
            case "desktop": {
                await this.handleTrack(this.tracks.screenSharing, newTrack);
                this.tracks.screenSharing = newTrack;
                break;
            }
            default: {
                throw new Error("This type of localTrack is not supported: " + type);
            }
        }

        return this.tracks;
    }

    private trackVolumeLocalAudioTrack(stream: MediaStream | undefined) {
        if (this.audioTrackInterval) {
            clearInterval(this.audioTrackInterval);
            this.audioTrackInterval = undefined;
        }
        if (stream && stream.getAudioTracks().length > 0) {
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            this.audioTrackInterval = setInterval(() => {
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const volume = sum / dataArray.length / 255;

                const talkingState = volume > 0.05;

                if (this.lastSentTalkingState !== talkingState) {
                    gameManager.getCurrentGameScene().connection?.emitPlayerShowVoiceIndicator(talkingState);
                    gameManager.getCurrentGameScene().CurrentPlayer.toggleTalk(talkingState);
                    this.lastSentTalkingState = talkingState;
                }
            }, 100);
        } else if (this.lastSentTalkingState) {
            gameManager.getCurrentGameScene().connection?.emitPlayerShowVoiceIndicator(false);
            gameManager.getCurrentGameScene().CurrentPlayer.toggleTalk(false, true);
        }
    }

    private addRemoteTrack(track: JitsiTrack, allowOverride: boolean) {
        const videoTracks = track.getOriginalStream()?.getVideoTracks();
        if (videoTracks && videoTracks.length > 0) {
            console.info("JitsiConferenceWrapper => addRemoteTrack => videoTracks", videoTracks[0].getSettings());
        }
        debug("JitsiConferenceWrapper => addRemoteTrack", track.getType());
        this._streamStore.update((tracks) => {
            // @ts-ignore getParticipantId() does indeed exist on track but is not documented.
            const participantId = track.getParticipantId();
            if (!participantId) {
                console.error("Track has no participantId", track);
                return tracks;
            }
            let jitsiTrackWrapper = tracks.get(participantId);

            if (!jitsiTrackWrapper) {
                jitsiTrackWrapper = new JitsiTrackWrapper(participantId, track, this.jitsiRoomName);
                tracks.set(participantId, jitsiTrackWrapper);
            } else {
                jitsiTrackWrapper.setJitsiTrack(track, allowOverride);
            }

            return tracks;
        });
    }

    private trackStateChanged(track: JitsiTrack) {
        //@ts-ignore track.muted does indeed exist even if not documented
        if (track.muted) {
            debug(`remote ${track.getType()} track is muted => removing`);
            this.removeRemoteTrack(track);
        } else {
            debug(`remote ${track.getType()} track is emitting => adding`);
            this.addRemoteTrack(track, true);
        }
    }

    private removeRemoteTrack(track: JitsiTrack) {
        this._streamStore.update((tracks) => {
            // Because Jitsi is nicely designed, if the track is local we need to get the participantId from the conference and not from the track
            // @ts-ignore track.getParticipantId does indeed exist on track but is not documented.
            const participantId = track.isLocal() ? this.myParticipantId : track.getParticipantId();
            if (!participantId) {
                console.error("Track has no participantId");
                return tracks;
            }

            const jitsiTrackWrapper = tracks.get(participantId);
            if (jitsiTrackWrapper) {
                if (track.isAudioTrack()) {
                    jitsiTrackWrapper.muteAudio();
                }
                if (track.isVideoTrack()) {
                    if (track.getVideoType() === "desktop") {
                        jitsiTrackWrapper.muteScreenSharing();
                    } else {
                        jitsiTrackWrapper.muteVideo();
                    }
                }
                // Do not remove the jitsiTrackWrapper if it is empty.
                // Indeed, when Jitsi switches from JVB to P2P mode, it destroys the JVB track first, then creates a new P2P track.
                // During a few milliseconds, the jitsiTrackWrapper is empty.
                /*if (
                    jitsiTrackWrapper.isEmpty()
                ) {
                    jitsiTrackWrapper.unsubscribe();
                    tracks.delete(participantId);
                }*/
            }

            return tracks;
        });
    }

    get broadcastDevicesStore(): Readable<DeviceBroadcastable[]> {
        return this._broadcastDevicesStore;
    }

    get streamStore(): Readable<Map<string, JitsiTrackWrapper>> {
        return this._streamStore;
    }

    get participantId(): string {
        return this.jitsiConference.myUserId();
    }

    private addUser(participantId: string) {
        this._streamStore.update((tracks) => {
            let jitsiTrackWrapper = tracks.get(participantId);
            if (!jitsiTrackWrapper) {
                // Let's create an empty JitsiTrackWrapper when a user enters the conference.
                jitsiTrackWrapper = new JitsiTrackWrapper(participantId, undefined, this.jitsiRoomName);
                tracks.set(participantId, jitsiTrackWrapper);
            }

            return tracks;
        });
    }

    private removeUser(participantId: string) {
        this._streamStore.update((tracks) => {
            const jitsiTrackWrapper = tracks.get(participantId);
            if (!jitsiTrackWrapper) {
                console.error("Could not find jitsiTrackWrapper for participantId", participantId);
                return tracks;
            }
            jitsiTrackWrapper.unsubscribe();
            tracks.delete(participantId);

            return tracks;
        });
    }

    public kickParticipant(participantId: string) {
        this.jitsiConference.kickParticipant(participantId, "Kicked by moderator");
    }
}
