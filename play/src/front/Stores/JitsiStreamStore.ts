import {Readable, readable, writable} from "svelte/store";
import type { VideoPeer } from "../WebRtc/VideoPeer";
import JitsiParticipant from "lib-jitsi-meet/types/hand-crafted/JitsiParticipant";
import JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
import { MapStore } from "@workadventure/store-utils";
import JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";
import JitsiConference from "lib-jitsi-meet/types/hand-crafted/JitsiConference";

class JitsiConferenceWrapper {

    public readonly participantStore : MapStore<string, JitsiParticipant>;

    public readonly streamStore : Readable<JitsiTrack[]>;

    constructor(private jitsiConference: JitsiConference) {

    }

    public static join(connection: JitsiConnection, jitsiRoomName: string): Promise<JitsiConferenceWrapper> {



        return new Promise((resolve, reject) => {
            const JitsiMeetJS = window.JitsiMeetJS;
            const room = connection.initJitsiConference(jitsiRoomName, {});

            const jitsiConferenceWrapper = new JitsiConferenceWrapper(room);

            let isJoined = false;
            let localTracks: any[] = [];
            room.on(
                JitsiMeetJS.events.conference.CONFERENCE_JOINED,
                () => {
                    isJoined = true;
                    resolve(jitsiConferenceWrapper);
                    console.error("conference joined")
                });
            room.on(
                JitsiMeetJS.events.conference.CONFERENCE_FAILED,
                (e) => {
                    reject(e);
                    console.error("conference failed")
                });
            room.on(
                JitsiMeetJS.events.conference.CONNECTION_ESTABLISHED,
                () => {
                    console.error("CONNECTION_ESTABLISHED")
                });
            room.on(
                JitsiMeetJS.events.conference.CONNECTION_INTERRUPTED,
                () => {
                    console.error("CONNECTION_INTERRUPTED")
                });
            room.on(
                JitsiMeetJS.events.conference.CONNECTION_RESTORED,
                () => {
                    console.error("CONNECTION_RESTORED")
                });

            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            // TODO continue here
            function onLocalTracks(tracks) {
                console.error("ONLOCALTRACKS", tracks)
                localTracks = tracks;
                for (let i = 0; i < localTracks.length; i++) {
                    localTracks[i].addEventListener(
                        JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                        audioLevel => console.log(`Audio Level local: ${audioLevel}`));
                    localTracks[i].addEventListener(
                        JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                        () => console.log('local track muted'));
                    localTracks[i].addEventListener(
                        JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                        () => console.log('local track stopped'));
                    localTracks[i].addEventListener(
                        JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                        deviceId =>
                            console.log(
                                `track audio output device was changed to ${deviceId}`));
                    if (localTracks[i].getType() === 'video') {
                        console.error("OUTPUTTING VIDEO")
                        /*   const video = document.createElement("video");
                           video.id = `localVideo${i}`;
                           video.autoplay = true;

                           window.document.body.prepend(video);

                           //$('body').append(`<video autoplay='1' id='localVideo${i}' />`);
                           localTracks[i].attach($(`#localVideo${i}`)[0]);*/
                    } else {
                        console.error("AUDIO ONLY")
                        /*$('body').append(
                            `<audio autoplay='1' muted='true' id='localAudio${i}' />`);
                        localTracks[i].attach($(`#localAudio${i}`)[0]);*/
                    }
                    if (isJoined) {
                        room.addTrack(localTracks[i]).catch(e => console.error(e));
                    }
                }
            }

            JitsiMeetJS.createLocalTracks({
                devices: [ 'video' ]
            }).then(onLocalTracks).catch(e => console.error(e));






            let remoteTracks: JitsiTrack[] = [];

            /**
             * Handles remote tracks
             * @param track JitsiTrack object
             */
            function onRemoteTrack(track: JitsiTrack) {
                if (track.isLocal()) {
                    return;
                }
                const participant = track.getParticipantId();

                if (!remoteTracks[participant]) {
                    remoteTracks[participant] = [];
                }
                const idx = remoteTracks[participant].push(track);

                track.addEventListener(
                    JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
                    audioLevel => console.log(`Audio Level remote: ${audioLevel}`));
                track.addEventListener(
                    JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                    () => console.log('remote track muted'));
                track.addEventListener(
                    JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                    () => console.log('remote track stopped'));
                track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
                    deviceId =>
                        console.log(
                            `track audio output device was changed to ${deviceId}`));
                const id = participant + track.getType() + idx;

                if (track.getType() === 'video') {
                    $('body').prepend(
                        `<video autoplay='1' id='${participant}video${idx}' />`);
                } else {
                    $('body').prepend(
                        `<audio autoplay='1' id='${participant}audio${idx}' />`);
                }
                track.attach(document.getElementById(`${id}`));
            }


            room.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack);
            room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, track => {
                console.log(`track removed!!!${track}`);
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

    public leave(reason?: string): Promise<unknown> {
        return this.jitsiConference.leave(reason);
    }

}


/**
 * A store that contains the list of (video) peers we are connected to.
 */
function createJitsiStreamStore() {
    const { subscribe, set, update } = writable(new Map<number, VideoPeer>());

    return {
        subscribe,
        pushNewPeer(peer: VideoPeer) {
            update((users) => {
                users.set(peer.userId, peer);

                //send post hog notification
                // TODO: analytics (is it worthwhile? Maybe only the people starting the stream is enough?)
                //analyticsClient.addNewParticipant();

                return users;
            });
        },
        removePeer(userId: number) {
            update((users) => {
                users.delete(userId);
                return users;
            });
        },
        cleanupStore() {
            set(new Map<number, VideoPeer>());
        },
    };
}

export const jitsiStreamStore = createJitsiStreamStore();