import { Readable, Unsubscriber, Writable, writable } from "svelte/store";
import JitsiParticipant from "lib-jitsi-meet/types/hand-crafted/JitsiParticipant";
import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { MapStore } from "@workadventure/store-utils";
import JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";
import JitsiConference from "lib-jitsi-meet/types/hand-crafted/JitsiConference";
import { jitsiLocalTracksStore } from "./JitsiLocalTracksStore";
import { JitsiLocalTracks } from "./JitsiLocalTracks";
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";
import Debug from "debug";

export type DeviceType = "video" | "audio" | "desktop";

const debug = Debug("libjitsi");

export class JitsiConferenceWrapper {
    public readonly participantStore: MapStore<string, JitsiParticipant>;

    private _streamStore: Writable<Map<string, JitsiTrackWrapper>>;

    private readonly _broadcastDevicesStore: Writable<DeviceType[]>;

    private localTracksStoreUnsubscribe: Unsubscriber | undefined;

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
                //isJoined = true;
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

            let oldTracks: JitsiLocalTracks = {
                audio: undefined,
                video: undefined,
                screenSharing: undefined,
            };

            jitsiConferenceWrapper.localTracksStoreUnsubscribe = jitsiLocalTracksStore.subscribe((result) => {
                if (!result) {
                    return;
                }
                if (result.ok) {
                    const tracks = result.value;
                    if (tracks.audio !== oldTracks.audio) {
                        if (tracks.audio === undefined && oldTracks.audio !== undefined) {
                            console.warn("REMOVING AUDIO TRACK");
                            room.removeTrack(oldTracks.audio);
                        } else if (tracks.audio !== undefined) {
                            if (oldTracks.audio !== undefined) {
                                console.warn("REPLACING AUDIO TRACK");
                                room.replaceTrack(oldTracks.audio, tracks.audio).catch((e) =>
                                    console.error("Error replacing track", e)
                                );
                            } else {
                                console.warn("ADDING AUDIO TRACK");
                                room.addTrack(tracks.audio).catch((e) => console.error("Error adding track", e));
                            }
                        }
                    }

                    if (tracks.video !== oldTracks.video) {
                        if (tracks.video === undefined && oldTracks.video !== undefined) {
                            debug("REMOVING VIDEO TRACK");
                            room.removeTrack(oldTracks.video);
                        } else if (tracks.video !== undefined) {
                            if (oldTracks.video !== undefined) {
                                debug("REPLACING VIDEO TRACK");
                                room.replaceTrack(oldTracks.video, tracks.video).catch((e) =>
                                    console.error("Error replacing track", e)
                                );
                            } else {
                                debug("ADDING VIDEO TRACK");
                                room.addTrack(tracks.video).catch((e) => console.error("Error adding track", e));
                            }
                        }
                    }

                    if (tracks.screenSharing !== oldTracks.screenSharing) {
                        if (tracks.screenSharing === undefined && oldTracks.screenSharing !== undefined) {
                            room.removeTrack(oldTracks.screenSharing);
                        } else if (tracks.screenSharing !== undefined) {
                            if (oldTracks.screenSharing !== undefined) {
                                room.replaceTrack(oldTracks.screenSharing, tracks.screenSharing).catch((e) =>
                                    console.error("Error replacing track", e)
                                );
                            } else {
                                room.addTrack(tracks.screenSharing).catch((e) =>
                                    console.error("Error adding track", e)
                                );
                            }
                        }
                    }

                    oldTracks = { ...tracks };
                } else {
                    console.error(result.error);
                }
            });

            const removeRemoteTrack = (track: JitsiTrack) => {
                jitsiConferenceWrapper._streamStore.update((tracks) => {
                    const participantId = track.getParticipantId();
                    if (!participantId) {
                        console.error("Track has no participantId");
                        return;
                    }

                    const jitsiTrackWrapper = tracks.get(participantId);
                    if (!jitsiTrackWrapper) {
                        throw new Error("JitsiTrackWrapper not found");
                    }
                    if (track.isAudioTrack()) {
                        jitsiTrackWrapper.muteAudio();
                    }
                    if (track.isVideoTrack()) {
                        jitsiTrackWrapper.muteVideo();
                    }
                    if (jitsiTrackWrapper.videoTrack === undefined && jitsiTrackWrapper.audioTrack === undefined) {
                        tracks.delete(participantId);
                    }

                    return tracks;
                });
            };

            const addRemoteTrack = (track: JitsiTrack) => {
                jitsiConferenceWrapper._streamStore.update((tracks) => {
                    const participantId = track.getParticipantId();
                    if (!participantId) {
                        console.error("Track has no participantId");
                        return;
                    }
                    let jitsiTrackWrapper = tracks.get(participantId);
                    if (!jitsiTrackWrapper) {
                        jitsiTrackWrapper = new JitsiTrackWrapper(track);
                        tracks.set(participantId, jitsiTrackWrapper);
                    } else {
                        jitsiTrackWrapper.setJitsiTrack(track);
                    }

                    return tracks;
                });
            };

            const trackStateChanged = (track: JitsiTrack) => {
                //@ts-ignore
                if (track.muted) {
                    debug("remote track is muted");
                    removeRemoteTrack(track);
                } else {
                    debug("remote track is emitting");
                    addRemoteTrack(track);
                }
            };

            /**
             * Handles remote tracks
             * @param track JitsiTrackWrapper object
             */
            function onRemoteTrack(track: JitsiTrack) {
                if (track.isLocal()) {
                    return;
                }

                addRemoteTrack(track);

                /*track.addEventListener(
                    JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                    audioLevel => console.log(`Audio Level remote: ${audioLevel}`));*/
                track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, (event) => {
                    trackStateChanged(track);
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
                if (track.isLocal()) {
                    return;
                }
                debug("remote track removed");
                removeRemoteTrack(track);
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
            room.join("");
        });
    }

    public broadcast(devices: ("video" | "audio" | "desktop")[]) {
        this._broadcastDevicesStore.set(devices);
    }

    public leave(reason?: string): Promise<unknown> {
        if (this.localTracksStoreUnsubscribe) {
            this.localTracksStoreUnsubscribe();
        }
        return this.jitsiConference.leave(reason);
    }

    get broadcastDevicesStore(): Readable<DeviceType[]> {
        return this._broadcastDevicesStore;
    }

    get streamStore(): Readable<JitsiTrackWrapper[]> {
        return this._streamStore;
    }
}
