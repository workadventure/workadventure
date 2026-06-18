import { Observable, Subject } from "rxjs";
import type { JoinProximityMeetingEvent } from "../../Events/ProximityMeeting/JoinProximityMeetingEvent";
import type { ParticipantProximityMeetingEvent } from "../../Events/ProximityMeeting/ParticipantProximityMeetingEvent";
import type {
    JoinMeetingEvent,
    MeetingKind,
    ParticipantMeetingEvent,
} from "../../Events/ProximityMeeting/MeetingEvent";

import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "../IframeApiContribution";
import { RemotePlayer } from "../Players/RemotePlayer";
import { apiCallback } from "../registeredCallbacks";
import type { AppendPCMDataEvent } from "../../Events/ProximityMeeting/AppendPCMDataEvent";
import { AudioStream } from "./AudioStream";

export class Meeting {
    private participantJoinStream: Subject<RemotePlayer> | undefined;
    private participantLeaveStream: Subject<RemotePlayer> | undefined;
    private leaveStream: Subject<void> | undefined;
    private pcmDataStream: Subject<Float32Array> = new Subject();
    private audioStreamListeners = new Map<
        number,
        { observable: Observable<Float32Array>; subscriptionsCount: number }
    >();

    public constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly kind: MeetingKind,
        public participants: RemotePlayer[],
    ) {}

    onParticipantJoin(): Subject<RemotePlayer> {
        if (this.participantJoinStream === undefined) {
            this.participantJoinStream = new Subject<RemotePlayer>();
        }
        return this.participantJoinStream;
    }

    onParticipantLeave(): Subject<RemotePlayer> {
        if (this.participantLeaveStream === undefined) {
            this.participantLeaveStream = new Subject<RemotePlayer>();
        }
        return this.participantLeaveStream;
    }

    onLeave(): Subject<void> {
        if (this.leaveStream === undefined) {
            this.leaveStream = new Subject<void>();
        }
        return this.leaveStream;
    }

    async playSound(url: string): Promise<void> {
        await queryWorkadventure(
            {
                type: "playSoundInMeeting",
                data: {
                    meetingId: this.id,
                    url,
                },
            },
            {
                timeout: null,
            },
        );
    }

    async startAudioStream(sampleRate: number): Promise<AudioStream> {
        await queryWorkadventure({
            type: "startStreamInMeeting",
            data: {
                meetingId: this.id,
                sampleRate,
            },
        });
        return new AudioStream(this.id);
    }

    listenToAudioStream(sampleRate: number): Observable<Float32Array> {
        const existingListener = this.audioStreamListeners.get(sampleRate);
        if (existingListener !== undefined) {
            return existingListener.observable;
        }

        const listener = {
            subscriptionsCount: 0,
            observable: new Observable<Float32Array>((subscriber) => {
                if (listener.subscriptionsCount === 0) {
                    sendToWorkadventure({
                        type: "startListeningToStreamInMeeting",
                        data: {
                            meetingId: this.id,
                            sampleRate,
                        },
                    });
                }

                listener.subscriptionsCount++;
                const subscription = this.pcmDataStream.subscribe(subscriber);

                return () => {
                    subscription.unsubscribe();
                    if (listener.subscriptionsCount === 0) {
                        return;
                    }

                    listener.subscriptionsCount--;
                    if (listener.subscriptionsCount > 0) {
                        return;
                    }

                    sendToWorkadventure({
                        type: "stopListeningToStreamInMeeting",
                        data: {
                            meetingId: this.id,
                        },
                    });
                };
            }),
        };

        this.audioStreamListeners.set(sampleRate, listener);
        return listener.observable;
    }

    stopListeningToAudioStreams(): void {
        for (const listener of this.audioStreamListeners.values()) {
            if (listener.subscriptionsCount > 0) {
                listener.subscriptionsCount = 0;
                sendToWorkadventure({
                    type: "stopListeningToStreamInMeeting",
                    data: {
                        meetingId: this.id,
                    },
                });
            }
        }
        this.audioStreamListeners.clear();
    }

    updateParticipants(participants: RemotePlayer[]): void {
        this.participants = participants;
    }

    participantJoined(player: RemotePlayer): void {
        this.participants = this.participants.filter((participant) => participant.playerId !== player.playerId);
        this.participants.push(player);
        this.participantJoinStream?.next(player);
    }

    participantLeft(player: RemotePlayer): void {
        this.participants = this.participants.filter((participant) => participant.playerId !== player.playerId);
        this.participantLeaveStream?.next(player);
    }

    leave(): void {
        this.stopListeningToAudioStreams();
        this.leaveStream?.next();
    }

    appendPCMData(data: Float32Array): void {
        this.pcmDataStream.next(data);
    }
}

export class WorkadventureMeetingsCommands extends IframeApiContribution<WorkadventureMeetingsCommands> {
    private joinStream: Subject<Meeting> | undefined;
    private meetings = new Map<string, Meeting>();

    callbacks = [
        apiCallback({
            type: "joinMeetingEvent",
            callback: (payloadData: JoinMeetingEvent) => {
                const participants = payloadData.users.map((user) => new RemotePlayer(user));
                let meeting = this.meetings.get(payloadData.meetingId);
                if (meeting === undefined) {
                    meeting = new Meeting(payloadData.meetingId, payloadData.name, payloadData.kind, participants);
                    this.meetings.set(payloadData.meetingId, meeting);
                } else {
                    meeting.updateParticipants(participants);
                }
                this.joinStream?.next(meeting);
            },
        }),
        apiCallback({
            type: "participantJoinMeetingEvent",
            callback: (payloadData: ParticipantMeetingEvent) => {
                this.meetings.get(payloadData.meetingId)?.participantJoined(new RemotePlayer(payloadData.user));
            },
        }),
        apiCallback({
            type: "participantLeaveMeetingEvent",
            callback: (payloadData: ParticipantMeetingEvent) => {
                this.meetings.get(payloadData.meetingId)?.participantLeft(new RemotePlayer(payloadData.user));
            },
        }),
        apiCallback({
            type: "leaveMeetingEvent",
            callback: (payloadData) => {
                const meeting = this.meetings.get(payloadData.meetingId);
                meeting?.leave();
                this.meetings.delete(payloadData.meetingId);
            },
        }),
        apiCallback({
            type: "appendMeetingPCMData",
            callback: (payloadData) => {
                this.meetings.get(payloadData.meetingId)?.appendPCMData(payloadData.data);
            },
        }),
    ];

    onJoin(): Subject<Meeting> {
        if (this.joinStream === undefined) {
            this.joinStream = new Subject<Meeting>();
        }
        return this.joinStream;
    }
}

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
     * @deprecated Use WA.player.meetings.onJoin() instead.
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
     * @deprecated Use Meeting.onParticipantJoin() from WA.player.meetings.onJoin() instead.
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
     * @deprecated Use Meeting.onParticipantLeave() from WA.player.meetings.onJoin() instead.
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
     * @deprecated Use Meeting.onLeave() from WA.player.meetings.onJoin() instead.
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
     * @deprecated Use Meeting.playSound() from WA.player.meetings.onJoin() instead.
     */
    async playSound(url: string): Promise<void> {
        await queryWorkadventure(
            {
                type: "playSoundInBubble",
                data: {
                    url: url,
                },
            },
            {
                timeout: null,
            },
        );
    }

    /**
     * Starts an audio stream played to all players in the current meeting.
     * {@link https://docs.workadventu.re/developer/map-scripting/references/api-player/#audio-streams | Website documentation}
     * @deprecated Use Meeting.startAudioStream() from WA.player.meetings.onJoin() instead.
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
     * @deprecated Use Meeting.listenToAudioStream() from WA.player.meetings.onJoin() instead.
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
