import { Subject } from "rxjs";
import type { JoinProximityMeetingEvent } from "../../Events/ProximityMeeting/JoinProximityMeetingEvent";
import type { ParticipantProximityMeetingEvent } from "../../Events/ProximityMeeting/ParticipantProximityMeetingEvent";

import { IframeApiContribution, queryWorkadventure } from "../IframeApiContribution";
import { RemotePlayer } from "../Players/RemotePlayer";
import { apiCallback } from "../registeredCallbacks";

let joinStream: Subject<RemotePlayer[]>;
let participantJoinStream: Subject<RemotePlayer>;
let participantLeaveStream: Subject<RemotePlayer>;
let leaveStream: Subject<void>;

export class WorkadventureProximityMeetingCommands extends IframeApiContribution<WorkadventureProximityMeetingCommands> {
    callbacks = [
        apiCallback({
            type: "joinProximityMeetingEvent",
            callback: (payloadData: JoinProximityMeetingEvent) => {
                joinStream?.next(payloadData.users.map((user) => new RemotePlayer(user)));
            },
        }),
        apiCallback({
            type: "participantJoinProximityMeetingEvent",
            callback: (payloadData: ParticipantProximityMeetingEvent) => {
                participantJoinStream?.next(new RemotePlayer(payloadData.user));
            },
        }),
        apiCallback({
            type: "participantLeaveProximityMeetingEvent",
            callback: (payloadData: ParticipantProximityMeetingEvent) => {
                participantLeaveStream?.next(new RemotePlayer(payloadData.user));
            },
        }),
        apiCallback({
            type: "leaveProximityMeetingEvent",
            callback: () => {
                leaveStream?.next();
            },
        }),
    ];

    /**
     * Detecting when the user enter on a meeting.
     * {@link https://workadventu.re/map-building/api-player.md#detecting-when-the-user-entersleaves-a-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer[]>} Observable who return the joined users
     */
    onJoin(): Subject<RemotePlayer[]> {
        if (joinStream === undefined) {
            joinStream = new Subject<RemotePlayer[]>();
        }
        return joinStream;
    }

    /**
     * Detecting when a participant joined on the current meeting.
     * {@link https://workadventu.re/map-building/api-player.md#detecting-when-a-participant-entersleaves-the-current-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer>} Observable who return the joined user
     */
    onParticipantJoin(): Subject<RemotePlayer> {
        if (participantJoinStream === undefined) {
            participantJoinStream = new Subject<RemotePlayer>();
        }
        return participantJoinStream;
    }

    /**
     * Detecting when a participant left on the current meeting.
     * {@link https://workadventu.re/map-building/api-player.md#detecting-when-a-participant-entersleaves-the-current-meeting | Website documentation}
     *
     * @returns {Subject<RemotePlayer>} Observable who return the left user
     */
    onParticipantLeave(): Subject<RemotePlayer> {
        if (participantLeaveStream === undefined) {
            participantLeaveStream = new Subject<RemotePlayer>();
        }
        return participantLeaveStream;
    }

    /**
     * Detecting when the user leave on a meeting.
     * {@link https://workadventu.re/map-building/api-player.md#detecting-when-the-user-entersleaves-a-meeting | Website documentation}
     */
    onLeave(): Subject<void> {
        if (leaveStream === undefined) {
            leaveStream = new Subject<void>();
        }
        return leaveStream;
    }

    async playSound(url: string): Promise<void> {
        await queryWorkadventure({
            type: "playSoundInBubble",
            data: {
                url: url,
            },
        });
    }
}

export default new WorkadventureProximityMeetingCommands();
