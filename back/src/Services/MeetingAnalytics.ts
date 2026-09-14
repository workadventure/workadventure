import type { AnalyticsStoredEvent } from "@workadventure/messages";
import { analyticsEventsQueue, type AnalyticsEventsQueue } from "./AnalyticsEventsQueue";

/**
 * What kind of meeting it was, decided from what the meeting IS rather than from how
 * its media happened to be carried.
 *
 * The distinction used to be derived from `meetingProvider`, which names a transport
 * and nothing else: a meeting area with four people or fewer never leaves WebRTC, so
 * it was filed as a spontaneous bubble. The back tells a `Group` from an area `Space`
 * by construction and has nothing to infer.
 */
export type MeetingKind = "bubble" | "area";

/** Why a meeting or a participation ended. */
export type MeetingEndReason = "closed" | "back_shutdown";

/**
 * A participant, flattened from whichever object the caller has — a game-room `User`
 * for a bubble, a `SpaceUser` for an area. The two share no supertype and neither
 * carries everything the row needs.
 */
export type MeetingParticipant = {
    /** Dedupe key, stable for the length of the participation. */
    key: string;
    uuid: string;
    userId: number | null;
    spaceUserId: string;
    roomId: string;
    tabId: string | null;
    clientIp: string | null;
};

type Participation = {
    participant: MeetingParticipant;
    joinedAtMs: number;
    leftAtMs?: number;
    joinRank: number;
};

type MeetingRecord = {
    meetingId: string;
    world: string;
    roomId: string;
    kind: MeetingKind;
    startedAtMs: number;
    participations: Map<string, Participation>;
    participantsSeen: number;
    peakParticipants: number;
    presentCount: number;
};

/**
 * A meeting needs two people. One person alone in a meeting area is standing in a
 * room, and counting that as collaboration is the same mistake as counting the
 * megaphone space: a configured area would manufacture conversation time for anyone
 * who walked through it.
 */
const MIN_PARTICIPANTS_FOR_A_MEETING = 2;

/**
 * One row per meeting, and one per participation — emitted by the only party that can
 * count either honestly.
 *
 * Every participant's client used to open its own `meeting.ended` interval, so a
 * meeting of four produced four rows: "conversation seconds" were participant-seconds,
 * the meeting count was a `uniqExact` over an id the clients happened to agree on, and
 * the average number of participants was not measurable at all — a duplicated tab
 * inflated it, a tab that died without closing deflated it.
 *
 * Here a meeting is a thing with a lifecycle rather than a thing each client believes
 * it is in: it starts once, ends once, and participations are counted against it.
 *
 * Every row is emitted when the meeting ENDS, participations included. That is what
 * makes the two-participant rule enforceable: a meeting that never had two people in
 * it leaves nothing behind at all, and a participation cannot be emitted before we
 * know whether the meeting it belongs to happened.
 */
export class MeetingAnalytics {
    private readonly meetings = new Map<string, MeetingRecord>();

    public constructor(
        private readonly queue: Pick<AnalyticsEventsQueue, "enqueue"> = analyticsEventsQueue,
        private readonly nowMs: () => number = Date.now,
    ) {}

    /** The kind a meeting was opened as, or undefined when it is not being tracked. */
    public kindOf(meetingId: string): MeetingKind | undefined {
        return this.meetings.get(meetingId)?.kind;
    }

    public meetingStarted(meetingId: string, world: string, roomId: string, kind: MeetingKind): void {
        if (this.meetings.has(meetingId)) {
            return;
        }

        this.meetings.set(meetingId, {
            meetingId,
            world,
            roomId,
            kind,
            startedAtMs: this.nowMs(),
            participations: new Map<string, Participation>(),
            participantsSeen: 0,
            peakParticipants: 0,
            presentCount: 0,
        });
    }

    public participantJoined(meetingId: string, participant: MeetingParticipant): void {
        const meeting = this.meetings.get(meetingId);
        if (!meeting || meeting.participations.has(participant.key)) {
            return;
        }

        meeting.participantsSeen += 1;
        meeting.presentCount += 1;
        meeting.peakParticipants = Math.max(meeting.peakParticipants, meeting.presentCount);
        meeting.participations.set(participant.key, {
            participant,
            joinedAtMs: this.nowMs(),
            // Who was already there when this one arrived. The first two opened the
            // meeting; anyone after joined a conversation already running.
            joinRank: meeting.participantsSeen,
        });
    }

    public participantLeft(meetingId: string, key: string): void {
        const participation = this.meetings.get(meetingId)?.participations.get(key);
        if (!participation || participation.leftAtMs !== undefined) {
            return;
        }

        participation.leftAtMs = this.nowMs();
        const meeting = this.meetings.get(meetingId);
        if (meeting) {
            meeting.presentCount -= 1;
        }
    }

    /** How many are in the meeting right now, for callers that end on the last leaver. */
    public presentCount(meetingId: string): number {
        return this.meetings.get(meetingId)?.presentCount ?? 0;
    }

    public meetingEnded(meetingId: string, endReason: MeetingEndReason = "closed"): void {
        const meeting = this.meetings.get(meetingId);
        if (!meeting) {
            return;
        }

        this.meetings.delete(meetingId);
        if (meeting.peakParticipants < MIN_PARTICIPANTS_FOR_A_MEETING) {
            return;
        }

        const endedAtMs = this.nowMs();
        // Participations first, so none of them ends after the meeting containing it —
        // the admin drops an inner row whose end falls past its container's.
        for (const participation of meeting.participations.values()) {
            this.emitParticipation(meeting, participation, endedAtMs, endReason);
        }

        this.queue.enqueue(
            this.row({
                eventName: "meeting.ended",
                meeting,
                // A meeting belongs to no one. The per-user view is the participation
                // row; attributing the meeting to one of its participants would count
                // the whole thing as that person's, which is the error being removed.
                participant: undefined,
                atMs: endedAtMs,
                eventId: `${meeting.meetingId}:meeting:${endedAtMs}`,
                properties: {
                    meetingId: meeting.meetingId,
                    meetingKind: meeting.kind,
                    participantCount: meeting.participantsSeen,
                    peakParticipantCount: meeting.peakParticipants,
                    startedAt: new Date(meeting.startedAtMs).toISOString(),
                    endedAt: new Date(endedAtMs).toISOString(),
                    durationSeconds: Math.max(0, (endedAtMs - meeting.startedAtMs) / 1000),
                    endReason,
                },
            }),
        );
    }

    /** Closes everything still open, for a graceful shutdown. Only enqueues. */
    public closeAll(endReason: MeetingEndReason = "back_shutdown"): number {
        const open = [...this.meetings.keys()];
        for (const meetingId of open) {
            this.meetingEnded(meetingId, endReason);
        }

        return open.length;
    }

    private emitParticipation(
        meeting: MeetingRecord,
        participation: Participation,
        meetingEndedAtMs: number,
        endReason: MeetingEndReason,
    ): void {
        const endedAtMs = participation.leftAtMs ?? meetingEndedAtMs;
        this.queue.enqueue(
            this.row({
                eventName: "meeting.participation.ended",
                meeting,
                participant: participation.participant,
                atMs: endedAtMs,
                eventId: `${meeting.meetingId}:${participation.participant.key}:${endedAtMs}`,
                properties: {
                    meetingId: meeting.meetingId,
                    meetingKind: meeting.kind,
                    joinRank: participation.joinRank,
                    startedAt: new Date(participation.joinedAtMs).toISOString(),
                    endedAt: new Date(endedAtMs).toISOString(),
                    durationSeconds: Math.max(0, (endedAtMs - participation.joinedAtMs) / 1000),
                    endReason,
                },
            }),
        );
    }

    private row(input: {
        eventName: string;
        meeting: MeetingRecord;
        participant: MeetingParticipant | undefined;
        atMs: number;
        eventId: string;
        properties: Record<string, unknown>;
    }): AnalyticsStoredEvent {
        const at = new Date(input.atMs).toISOString();

        return {
            eventName: input.eventName,
            // "pusher" means "a trusted server", which is what the admin gates on: the
            // value a socket may never claim. A dedicated "back" would say more, but it
            // is a JsonMessages edit, and that bumps apiVersionHash — a forced reload of
            // every connected front, to relabel rows nothing reads by source.
            source: "pusher",
            // Both ends measured on the same clock, and it is the server's: nothing here
            // came from a browser, so there is no skew to clamp.
            clientEventTime: at,
            pusherReceivedAt: at,
            eventId: input.eventId,
            userUuid: input.participant?.uuid ?? "",
            userId: input.participant?.userId ?? null,
            spaceUserId: input.participant?.spaceUserId ?? "",
            clientIp: input.participant?.clientIp ?? null,
            world: input.meeting.world,
            roomId: input.participant?.roomId ?? input.meeting.roomId,
            tabId: input.participant?.tabId ?? null,
            properties: input.properties,
        };
    }
}

export const meetingAnalytics = new MeetingAnalytics();
