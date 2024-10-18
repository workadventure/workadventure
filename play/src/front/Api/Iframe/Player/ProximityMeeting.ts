import { Observable, Subject } from "rxjs";
import type { JoinProximityMeetingEvent } from "../../Events/ProximityMeeting/JoinProximityMeetingEvent";
import type { ParticipantProximityMeetingEvent } from "../../Events/ProximityMeeting/ParticipantProximityMeetingEvent";

import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "../IframeApiContribution";
import { RemotePlayer } from "../Players/RemotePlayer";
import { apiCallback } from "../registeredCallbacks";
import { AppendPCMDataEvent } from "../../Events/ProximityMeeting/AppendPCMDataEvent";
import { AudioStream } from "./AudioStream";

export class WorkadventureProximityMeetingCommands extends IframeApiContribution<WorkadventureProximityMeetingCommands> {
    private joinStream: Subject<RemotePlayer[]> | undefined;
    private participantJoinStream: Subject<RemotePlayer> | undefined;
    private participantLeaveStream: Subject<RemotePlayer> | undefined;
    private followedStream: Subject<RemotePlayer> | undefined;
    private unfollowedStream: Subject<RemotePlayer> | undefined;
    private leaveStream: Subject<void> | undefined;
    private pcmDataStream: Subject<Float32Array> = new Subject();

    callbacks = [
        apiCallback({
            type: "joinProximityMeetingEvent",
            callback: (payloadData: JoinProximityMeetingEvent) => {
                this.joinStream?.next(payloadData.users.map((user) => new RemotePlayer(user)));
            },
        }),
        apiCallback({
            type: "participantJoinProximityMeetingEvent",
            callback: (payloadData: ParticipantProximityMeetingEvent) => {
                this.participantJoinStream?.next(new RemotePlayer(payloadData.user));
            },
        }),
        apiCallback({
            type: "participantLeaveProximityMeetingEvent",
            callback: (payloadData: ParticipantProximityMeetingEvent) => {
                this.participantLeaveStream?.next(new RemotePlayer(payloadData.user));
            },
        }),
        apiCallback({
            type: "leaveProximityMeetingEvent",
            callback: () => {
                this.leaveStream?.next();
            },
        }),
        apiCallback({
            type: "onFollowed",
            callback: (payloadData: ParticipantProximityMeetingEvent) => {
                this.followedStream?.next(new RemotePlayer(payloadData.user));
            },
        }),
        apiCallback({
            type: "onUnfollowed",
            callback: (payloadData: ParticipantProximityMeetingEvent) => {
                this.unfollowedStream?.next(new RemotePlayer(payloadData.user));
            },
        }),
        apiCallback({
            type: "appendPCMData",
            callback: (payloadData: AppendPCMDataEvent) => {
                this.pcmDataStream.next(payloadData.data);
            },
        }),
    ];

    /**
     * Detecting when the user enter on a meeting.
     * {@link https://docs.workadventu.re/map-building/api-player.md#detecting-when-the-user-entersleaves-a-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer[]>} Observable who return the joined users
     */
    onJoin(): Subject<RemotePlayer[]> {
        if (this.joinStream === undefined) {
            this.joinStream = new Subject<RemotePlayer[]>();
        }
        return this.joinStream;
    }

    /**
     * Detecting when a participant joined on the current meeting.
     * {@link https://docs.workadventu.re/map-building/api-player.md#detecting-when-a-participant-entersleaves-the-current-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer>} Observable who return the joined user
     */
    onParticipantJoin(): Subject<RemotePlayer> {
        if (this.participantJoinStream === undefined) {
            this.participantJoinStream = new Subject<RemotePlayer>();
        }
        return this.participantJoinStream;
    }

    /**
     * Detecting when a participant left on the current meeting.
     * {@link https://docs.workadventu.re/map-building/api-player.md#detecting-when-a-participant-entersleaves-the-current-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer>} Observable who return the left user
     */
    onParticipantLeave(): Subject<RemotePlayer> {
        if (this.participantLeaveStream === undefined) {
            this.participantLeaveStream = new Subject<RemotePlayer>();
        }
        return this.participantLeaveStream;
    }

    /**
     * Detecting when the user leave on a meeting.
     * {@link https://docs.workadventu.re/developer/map-scripting/references/api-player/#detecting-when-the-user-entersleaves-a-meeting | Website documentation}
     */
    onLeave(): Subject<void> {
        if (this.leaveStream === undefined) {
            this.leaveStream = new Subject<void>();
        }
        return this.leaveStream;
    }

    /**
     * Play a sound to all players in the current meeting.
     * {@link https://docs.workadventu.re/developer/map-scripting/references/api-player/#playing-a-sound-to-players-in-the-same-meeting | Website documentation}
     */
    async playSound(url: string): Promise<void> {
        await queryWorkadventure({
            type: "playSoundInBubble",
            data: {
                url: url,
            },
        });
    }

    /**
     * Starts an audio stream played to all players in the current meeting.
     * {@link https://docs.workadventu.re/developer/map-scripting/references/api-player/#audio-streams | Website documentation}
     * @param {number} sampleRate - The sample rate of the audio stream expressed in Hertz.
     */
    async startAudioStream(sampleRate: number): Promise<AudioStream> {
        // TODO: improve this to make sure the audio stream is correctly destroyed when the iframe is left.
        await queryWorkadventure({
            type: "startStreamInBubble",
            data: {
                sampleRate,
            },
        });
        return new AudioStream();
    }

    /**
     * Listen to the audio stream played sent by all players.
     * The voice of all players in the bubble is merged in a single stream that is regularly sent to the callback.
     * @param {number} sampleRate - The sample rate of the audio stream expressed in Hertz.
     */
    listenToAudioStream(sampleRate: number): Observable<Float32Array> {
        return new Observable<Float32Array>((subscriber) => {
            sendToWorkadventure({
                type: "startListeningToStreamInBubble",
                data: {
                    sampleRate,
                },
            });

            const subscription = this.pcmDataStream.subscribe(subscriber);

            return () => {
                subscription.unsubscribe();
                sendToWorkadventure({
                    type: "stopListeningToStreamInBubble",
                    data: undefined,
                });
            };
        });
    }

    /**
     * Ask all players in the current meeting to follow the player.
     * Note that unlike with the "follow" mode in the UI, the other players will automatically follow the player.
     */
    async followMe(): Promise<void> {
        await queryWorkadventure({
            type: "followMe",
            data: undefined,
        });
    }

    async stopLeading(): Promise<void> {
        await queryWorkadventure({
            type: "stopLeading",
            data: undefined,
        });
    }

    /**
     * Triggered when a player starts following us.
     */
    onFollowed(): Subject<RemotePlayer> {
        if (this.followedStream === undefined) {
            this.followedStream = new Subject<RemotePlayer>();
        }
        return this.followedStream;
    }

    /**
     * Triggered when a player stops following us.
     */
    onUnfollowed(): Subject<RemotePlayer> {
        if (this.unfollowedStream === undefined) {
            this.unfollowedStream = new Subject<RemotePlayer>();
        }
        return this.unfollowedStream;
    }
}
