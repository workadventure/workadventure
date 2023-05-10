// eslint-disable @typescript-eslint/ban-ts-comment
import { get, readable, Readable, Unsubscriber, Writable, writable } from "svelte/store";
import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";
import JitsiConference from "lib-jitsi-meet/types/hand-crafted/JitsiConference";
import Debug from "debug";
import { Result } from "@workadventure/map-editor";
import JitsiLocalTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiLocalTrack";
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
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";
import { JitsiLocalTracks } from "./JitsiLocalTracks";

export type DeviceType = "video" | "audio" | "desktop";

const debug = Debug("libjitsi");

export class JitsiConferenceWrapper {
    //public readonly participantStore: MapStore<string, JitsiParticipant>;
    private myParticipantId: string | undefined;
    private _streamStore: Writable<Map<string, JitsiTrackWrapper>>;

    private readonly _broadcastDevicesStore: Writable<DeviceType[]>;

    private localTracksStore: Readable<Result<JitsiLocalTracks, Error> | undefined>;

    private requestedCameraStateUnsubscriber: Unsubscriber | undefined;
    private requestedMicrophoneStateUnsubscriber: Unsubscriber | undefined;
    private cameraDeviceIdStoreUnsubscriber: Unsubscriber | undefined;
    private microphoneDeviceIdStoreUnsubscriber: Unsubscriber | undefined;
    private cameraDeviceId: string | undefined = undefined;
    private microphoneDeviceId: string | undefined = undefined;

    private tracks: JitsiLocalTracks = {
        audio: undefined,
        video: undefined,
        screenSharing: undefined,
    };

    private firstLocalTrackInitialization = false;

    constructor(private jitsiConference: JitsiConference) {
        this._streamStore = writable<Map<string, JitsiTrackWrapper>>(new Map<string, JitsiTrackWrapper>());
        this._broadcastDevicesStore = writable<DeviceType[]>([]);
        this.localTracksStore = readable<Result<JitsiLocalTracks, Error> | undefined>(undefined);
    }

    public static join(connection: JitsiConnection, jitsiRoomName: string): Promise<JitsiConferenceWrapper> {
        return new Promise((resolve, reject) => {
            const JitsiMeetJS = window.JitsiMeetJS;
            const room = connection.initJitsiConference(jitsiRoomName, {});

            const jitsiConferenceWrapper = new JitsiConferenceWrapper(room);

            //let isJoined = false;
            //const localTracks: any[] = [];
            room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
                //isJoined = true;
                void jitsiConferenceWrapper.firstLocalTrackInit();
                resolve(jitsiConferenceWrapper);
                console.error("conference joined");
            });
            room.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, (e) => {
                reject(e);
                console.error("conference failed");
            });
            room.on(JitsiMeetJS.events.conference.CONNECTION_ESTABLISHED, () => {
                console.error("CONNECTION_ESTABLISHED");
            });
            room.on(JitsiMeetJS.events.conference.CONNECTION_INTERRUPTED, () => {
                console.error("CONNECTION_INTERRUPTED");
            });
            room.on(JitsiMeetJS.events.conference.CONNECTION_RESTORED, () => {
                console.error("CONNECTION_RESTORED");
            });

            jitsiConferenceWrapper.requestedCameraStateUnsubscriber = requestedCameraState.subscribe(
                (requestedCameraState) => {
                    if (jitsiConferenceWrapper.firstLocalTrackInitialization) {
                        (async (): Promise<JitsiLocalTracks> =>
                            jitsiConferenceWrapper.handleLocalTrackState("video", requestedCameraState))()
                            .then((newTracks) => {
                                console.log("this is a success");
                            })
                            .catch((e) => {
                                console.error("jitsiLocalTracks", e);
                            });
                    }
                }
            );

            jitsiConferenceWrapper.requestedMicrophoneStateUnsubscriber = requestedMicrophoneState.subscribe(
                (requestedMicrophoneState) => {
                    if (jitsiConferenceWrapper.firstLocalTrackInitialization) {
                        (async (): Promise<JitsiLocalTracks> =>
                            jitsiConferenceWrapper.handleLocalTrackState("audio", requestedMicrophoneState))()
                            .then((newTracks) => {
                                console.log("this is a success");
                            })
                            .catch((e) => {
                                console.error("jitsiLocalTracks", e);
                            });
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
                                console.log("this is a success");
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
                                console.log("this is a success");
                            })
                            .catch((e) => {
                                console.error("jitsiLocalTracks", e);
                            });
                    }
                }
            );

            /**
             * Handles remote tracks
             * @param track JitsiTrackWrapper object
             */
            function onRemoteTrack(track: JitsiTrack) {
                if (track.isLocal()) {
                    console.log("Received my remote track", track);
                }

                console.log("JitsiConferenceWrapper => onRemoteTrack");

                jitsiConferenceWrapper.addRemoteTrack(track, false);

                /*track.addEventListener(
                    JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                    audioLevel => console.log(`Audio Level remote: ${audioLevel}`));*/
                track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, (event) => {
                    jitsiConferenceWrapper.trackStateChanged(track);
                });
                track.addEventListener(JitsiMeetJS.events.track.NO_DATA_FROM_SOURCE, (event) => {
                    console.log("track no data from source");
                });
                track.addEventListener(JitsiMeetJS.events.track.TRACK_VIDEOTYPE_CHANGED, (event) => {
                    console.log("track video type changed");
                });
                track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () => {
                    console.log("local track stopped");
                });
                track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED, (deviceId) =>
                    console.log(`track audio output device was changed to ${deviceId}`)
                );

                /*const id = participant + track.getType() + idx;

                if (track.getType() === 'video') {
                    $('body').prepend(
                        `<video autoplay='1' id='${participant}video${idx}'  />`);
                } else {
                    $('body').prepend(
                        `<audio autoplay='1' id='${participant}audio${idx}' />`);
                }
                track.attach(document.getElementById(`${id}`));*/

                /*jitsiConferenceWrapper._streamStore.update((tracks) => {
                    tracks.push(new JitsiTrackWrapper(track));
                    return tracks;
                });*/
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
                console.log(`remote ${track.type} track removed`);
                jitsiConferenceWrapper.removeRemoteTrack(track);
            });

            /*room.on(JitsiMeetJS.events.conference.USER_JOINED, id => {
                console.log('user join');
                remoteTracks[id] = [];
            });
            room.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
            room.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, track => {
                console.log(`${track.getType()} - ${track.isMuted()}`);
            });
            room.on(
                JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
                (userID, displayName) => console.log(`${userID} - ${displayName}`));
            room.on(
                JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
                (userID, audioLevel) => console.log(`${userID} - ${audioLevel}`));
            room.on(
                JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED,
                () => console.log(`${room.getPhoneNumber()} - ${room.getPhonePin()}`));*/
            jitsiConferenceWrapper.myParticipantId = room.myUserId();
            room.join("");
        });
    }

    public broadcast(devices: ("video" | "audio" | "desktop")[]) {
        this._broadcastDevicesStore.set(devices);
    }

    public leave(reason?: string): Promise<unknown> {
        console.log("JitsiConferenceWrapper => leaving ...");
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
        this._streamStore.update((tracks) => {
            tracks.forEach((track) => {
                track.unsubscribe();
            });
            return new Map<string, JitsiTrackWrapper>();
        });
        return this.jitsiConference.leave(reason).then(() => {
            if (this.tracks.audio) {
                void this.handleTrack(this.tracks.audio, undefined);
            }
            if (this.tracks.video) {
                void this.handleTrack(this.tracks.video, undefined);
            }
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
        if (oldTrack && track) {
            console.warn(`REPLACING LOCAL ${oldTrack.getType()} TRACK`);
            await this.jitsiConference.replaceTrack(oldTrack, track);
        } else if (oldTrack && !track) {
            console.warn(`REMOVING LOCAL ${oldTrack.getType()} TRACK`);
            await oldTrack.dispose();
            //room.removeTrack(oldTrack);
            //await oldTrack.dispose();
        } else if (!oldTrack && track) {
            console.warn(`ADDING LOCAL ${track.getType()} TRACK`);
            await this.jitsiConference.addTrack(track);
        }
    }

    public async firstLocalTrackInit() {
        if (get(megaphoneEnabledStore)) {
            const requestedDevices: DeviceType[] = [];
            if (get(requestedCameraState)) {
                requestedDevices.push("video");
            }
            if (get(requestedMicrophoneState)) {
                requestedDevices.push("audio");
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
                        await this.handleTrack(this.tracks.video, track);
                        this.tracks.video = track;
                    } else if (track.isScreenSharing()) {
                        await this.handleTrack(this.tracks.screenSharing, track);
                        this.tracks.screenSharing = track;
                    }
                }
            }
            console.log("JitsiConferenceWrapper => handleFirstLocalTrack => success");
            this.firstLocalTrackInitialization = true;
        }
    }

    private async handleLocalTrackState(type: DeviceType, state: boolean) {
        console.log("JitsiConferenceWrapper => handleLocalTrackState", type, state);
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

    private addRemoteTrack(track: JitsiTrack, allowOverride: boolean) {
        console.log("JitsiConferenceWrapper => addRemoteTrack", track.getType());
        this._streamStore.update((tracks) => {
            // @ts-ignore
            const participantId = track.getParticipantId();
            if (!participantId) {
                console.error("Track has no participantId");
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
            console.log(`remote ${track.getType()} track is muted => removing`);
            this.removeRemoteTrack(track);
        } else {
            console.log(`remote ${track.getType()} track is emitting => adding`);
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
                    jitsiTrackWrapper.muteVideo();
                }
                if (jitsiTrackWrapper.videoTrack === undefined && jitsiTrackWrapper.audioTrack === undefined) {
                    jitsiTrackWrapper.unsubscribe();
                    tracks.delete(participantId);
                }
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
}
