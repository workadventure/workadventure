// eslint-disable @typescript-eslint/ban-ts-comment
import { get, Readable, Unsubscriber, Writable, writable } from "svelte/store";
// eslint-disable-next-line import/no-unresolved
import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
// eslint-disable-next-line import/no-unresolved
import JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";
// eslint-disable-next-line import/no-unresolved
import JitsiConference from "lib-jitsi-meet/types/hand-crafted/JitsiConference";
import Debug from "debug";
// eslint-disable-next-line import/no-unresolved
import JitsiLocalTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiLocalTrack";
// eslint-disable-next-line import/no-unresolved
import { JitsiConferenceErrors } from "lib-jitsi-meet/types/hand-crafted/JitsiConferenceErrors";
import {
    requestedCameraDeviceIdStore,
    requestedMicrophoneDeviceIdStore,
    requestedCameraState,
    requestedMicrophoneState,
    usedCameraDeviceIdStore,
    usedMicrophoneDeviceIdStore,
} from "../../Stores/MediaStore";
import { megaphoneEnabledStore } from "../../Stores/MegaphoneStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";
import { JitsiLocalTracks } from "./JitsiLocalTracks";

export type DeviceType = "video" | "audio" | "desktop";

const debug = Debug("libjitsi");

export class JitsiConferenceWrapper {
    //public readonly participantStore: MapStore<string, JitsiParticipant>;
    private myParticipantId: string | undefined;
    private _streamStore: Writable<Map<string, JitsiTrackWrapper>>;

    private readonly _broadcastDevicesStore: Writable<DeviceType[]>;

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

    private firstLocalTrackInitialization = false;

    constructor(private jitsiConference: JitsiConference) {
        this._streamStore = writable<Map<string, JitsiTrackWrapper>>(new Map<string, JitsiTrackWrapper>());
        this._broadcastDevicesStore = writable<DeviceType[]>([]);
    }

    public static join(connection: JitsiConnection, jitsiRoomName: string): Promise<JitsiConferenceWrapper> {
        return new Promise((resolve, reject) => {
            const JitsiMeetJS = window.JitsiMeetJS;
            const room = connection.initJitsiConference(jitsiRoomName, {});

            const jitsiConferenceWrapper = new JitsiConferenceWrapper(room);

            //let isJoined = false;
            //const localTracks: any[] = [];
            room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
                debug("CONFERENCE_JOINED");
                void jitsiConferenceWrapper.firstLocalTrackInit();
                resolve(jitsiConferenceWrapper);
            });
            room.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, (e) => {
                reject(e);
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
                    if (jitsiConferenceWrapper.firstLocalTrackInitialization) {
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
                    if (jitsiConferenceWrapper.firstLocalTrackInitialization) {
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
                        jitsiConferenceWrapper.firstLocalTrackInitialization &&
                        cameraDeviceId !== jitsiConferenceWrapper.cameraDeviceId
                    ) {
                        (async () => jitsiConferenceWrapper.handleLocalTrackState("video", true))()
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
                        jitsiConferenceWrapper.firstLocalTrackInitialization &&
                        microphoneDeviceId !== jitsiConferenceWrapper.microphoneDeviceId
                    ) {
                        (async () => jitsiConferenceWrapper.handleLocalTrackState("audio", true))()
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
                    if (jitsiConferenceWrapper.firstLocalTrackInitialization) {
                        if (
                            (jitsiConferenceWrapper.tracks.screenSharing && !requestedScreenSharingState_) ||
                            (!jitsiConferenceWrapper.tracks.screenSharing && requestedScreenSharingState_)
                        ) {
                            (async (): Promise<JitsiLocalTracks> =>
                                jitsiConferenceWrapper.handleLocalTrackState("desktop", requestedScreenSharingState_))()
                                .then((newTracks) => {
                                    debug("requestedScreenSharingState => subscribe => localTrack added");
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

            room.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack);
            room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
                /*
                if (track.isLocal()) {
                    jitsiConferenceWrapper._myStreamStore.update((old) => {
                        if(old){
                            if(track.isAudioTrack()) {
                                old.muteAudio();
                            } else if(track.isVideoTrack()) {
                                old.muteVideo();
                            }
                        }
                        return old;
                    });
                    return;
                }
                 */
                debug(`remote ${track.type} track removed`);
                jitsiConferenceWrapper.removeRemoteTrack(track);
            });
            room.on(JitsiMeetJS.events.conference.USER_LEFT, (id) => {
                jitsiConferenceWrapper.removeUser(id);
            });
            /*room.on(JitsiMeetJS.events.conference.USER_JOINED, id => {
                debug('user join');
                remoteTracks[id] = [];
            });
            room.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
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
        });
    }

    public broadcast(devices: ("video" | "audio" | "desktop")[]) {
        this._broadcastDevicesStore.set(devices);
    }

    public async leave(reason?: string): Promise<void> {
        debug("JitsiConferenceWrapper => leaving ...");
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
    }

    private async createLocalTracks(types: DeviceType[]): Promise<JitsiLocalTrack[]> {
        this.cameraDeviceId = get(requestedCameraDeviceIdStore);
        this.microphoneDeviceId = get(requestedMicrophoneDeviceIdStore);

        const newTracks = await window.JitsiMeetJS.createLocalTracks({
            devices: types,
            cameraDeviceId: this.cameraDeviceId,
            micDeviceId: this.microphoneDeviceId,
        });
        if (!(newTracks instanceof Array)) {
            // newTracks is a JitsiConferenceError
            throw newTracks;
        } else {
            newTracks.forEach((track) => {
                if (track.isVideoTrack()) {
                    usedCameraDeviceIdStore.set(track.getDeviceId());
                } else if (track.isAudioTrack()) {
                    usedMicrophoneDeviceIdStore.set(track.getDeviceId());
                }
            });
        }
        return newTracks;
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

    public async firstLocalTrackInit() {
        debug("JitsiConferenceWrapper => firstLocalTrackInit");
        if (get(megaphoneEnabledStore)) {
            const requestedDevices: DeviceType[] = [];
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
                for (const track of newTracks) {
                    if (track.isAudioTrack()) {
                        await this.handleTrack(this.tracks.audio, track);
                        this.tracks.audio = track;
                    } else if (track.isVideoTrack()) {
                        if (track.getVideoType() === "desktop") {
                            await this.handleTrack(this.tracks.screenSharing, track);
                            this.tracks.screenSharing = track;
                        } else {
                            await this.handleTrack(this.tracks.video, track);
                            this.tracks.video = track;
                        }
                    }
                }
            }
            debug("JitsiConferenceWrapper => handleFirstLocalTrack => success");
            this.firstLocalTrackInitialization = true;
        }
    }

    private async handleLocalTrackState(type: DeviceType, state: boolean) {
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
        debug("JitsiConferenceWrapper => addRemoteTrack", track.getType());
        this._streamStore.update((tracks) => {
            // @ts-ignore
            const participantId = track.getParticipantId();
            if (!participantId) {
                console.error("Track has no participantId", track);
                throw new Error("Track has no participantId");
                return tracks;
            }
            let jitsiTrackWrapper = tracks.get(participantId);
            if (!jitsiTrackWrapper) {
                jitsiTrackWrapper = new JitsiTrackWrapper(participantId, track);
                tracks.set(participantId, jitsiTrackWrapper);
            } else {
                jitsiTrackWrapper.setJitsiTrack(track, allowOverride);
            }

            return tracks;
        });
    }

    private trackStateChanged(track: JitsiTrack) {
        //@ts-ignore
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
            // @ts-ignore
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

    get broadcastDevicesStore(): Readable<DeviceType[]> {
        return this._broadcastDevicesStore;
    }

    get streamStore(): Readable<Map<string, JitsiTrackWrapper>> {
        return this._streamStore;
    }

    get participantId(): string {
        return this.jitsiConference.myUserId();
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
}
