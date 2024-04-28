import { Subject } from "rxjs";
import type { JoinProximityMeetingEvent } from "../../Events/ProximityMeeting/JoinProximityMeetingEvent";
import type { ParticipantProximityMeetingEvent } from "../../Events/ProximityMeeting/ParticipantProximityMeetingEvent";

import { IframeApiContribution, queryWorkadventure } from "../IframeApiContribution";
import { RemotePlayer } from "../Players/RemotePlayer";
import { apiCallback } from "../registeredCallbacks";

export class WorkadventureProximityMeetingCommands<T extends {[key: string]: unknown}> extends IframeApiContribution<WorkadventureProximityMeetingCommands<T>> {
    private joinStream: Subject<RemotePlayer<T>[]>|undefined;
    private participantJoinStream: Subject<RemotePlayer<T>>|undefined;
    private participantLeaveStream: Subject<RemotePlayer<T>>|undefined;
    private followedStream: Subject<RemotePlayer<T>>|undefined;
    private unfollowedStream: Subject<RemotePlayer<T>>|undefined;
    private leaveStream: Subject<void>|undefined;

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
    ];

    /**
     * Detecting when the user enter on a meeting.
     * {@link https://workadventu.re/map-building/api-player.md#detecting-when-the-user-entersleaves-a-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer[]>} Observable who return the joined users
     */
    onJoin(): Subject<RemotePlayer<T>[]> {
        if (this.joinStream === undefined) {
            this.joinStream = new Subject<RemotePlayer<T>[]>();
        }
        return this.joinStream;
    }

    /**
     * Detecting when a participant joined on the current meeting.
     * {@link https://workadventu.re/map-building/api-player.md#detecting-when-a-participant-entersleaves-the-current-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer>} Observable who return the joined user
     */
    onParticipantJoin(): Subject<RemotePlayer<T>> {
        if (this.participantJoinStream === undefined) {
            this.participantJoinStream = new Subject<RemotePlayer<T>>();
        }
        return this.participantJoinStream;
    }

    /**
     * Detecting when a participant left on the current meeting.
     * {@link https://workadventu.re/map-building/api-player.md#detecting-when-a-participant-entersleaves-the-current-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer>} Observable who return the left user
     */
    onParticipantLeave(): Subject<RemotePlayer<T>> {
        if (this.participantLeaveStream === undefined) {
            this.participantLeaveStream = new Subject<RemotePlayer<T>>();
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
    onFollowed(): Subject<RemotePlayer<T>> {
        if (this.followedStream === undefined) {
            this.followedStream = new Subject<RemotePlayer<T>>();
        }
        return this.followedStream;
    }

    /**
     * Triggered when a player stops following us.
     */
    onUnfollowed(): Subject<RemotePlayer<T>> {
        if (this.unfollowedStream === undefined) {
            this.unfollowedStream = new Subject<RemotePlayer<T>>();
        }
        return this.unfollowedStream;
    }
}
