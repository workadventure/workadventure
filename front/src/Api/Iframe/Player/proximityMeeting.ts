import { Subject } from "rxjs";
import { JoinProximityMeetingEvent } from "../../Events/ProximityMeeting/JoinProximityMeetingEvent";
import { ParticipantProximityMeetingEvent } from "../../Events/ProximityMeeting/ParticipantProximityMeetingEvent";

import { IframeApiContribution } from "../IframeApiContribution";
import { apiCallback } from "../registeredCallbacks";

let joinStream: Subject<JoinProximityMeetingEvent>;
let participantJoinStream: Subject<ParticipantProximityMeetingEvent>;
let participantLeaveStream: Subject<ParticipantProximityMeetingEvent>;
let leaveStream: Subject<void>;

export class WorkadventureProximityMeetingCommands extends IframeApiContribution<WorkadventureProximityMeetingCommands> {
    callbacks = [
        apiCallback({
            type: "joinProximityMeetingEvent",
            callback: (payloadData: JoinProximityMeetingEvent) => {
                joinStream.next(payloadData);
            },
        }),
        apiCallback({
            type: "participantJoinProximityMeetingEvent",
            callback: (payloadData: ParticipantProximityMeetingEvent) => {
                participantJoinStream.next(payloadData);
            },
        }),
        apiCallback({
            type: "participantLeaveProximityMeetingEvent",
            callback: (payloadData: ParticipantProximityMeetingEvent) => {
                participantLeaveStream.next(payloadData);
            },
        }),
        apiCallback({
            type: "leaveProximityMeetingEvent",
            callback: () => {
                leaveStream.next();
            },
        }),
    ];

    onJoin(): Subject<JoinProximityMeetingEvent> {
        if (joinStream === undefined) {
            joinStream = new Subject<JoinProximityMeetingEvent>();
        }
        return joinStream;
    }

    onParticipantJoin(): Subject<ParticipantProximityMeetingEvent> {
        if (participantJoinStream === undefined) {
            participantJoinStream = new Subject<ParticipantProximityMeetingEvent>();
        }
        return participantJoinStream;
    }

    onParticipantLeave(): Subject<ParticipantProximityMeetingEvent> {
        if (participantLeaveStream === undefined) {
            participantLeaveStream = new Subject<ParticipantProximityMeetingEvent>();
        }
        return participantLeaveStream;
    }

    onLeave(): Subject<void> {
        if (leaveStream === undefined) {
            leaveStream = new Subject<void>();
        }
        return leaveStream;
    }
}

export default new WorkadventureProximityMeetingCommands();
