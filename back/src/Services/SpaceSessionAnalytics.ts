import { isMeetingKind, type AnalyticsStoredEvent, type SpaceKind } from "@workadventure/messages";
import type { AnalyticsEventsQueue } from "@workadventure/shared-utils";
import { analyticsEventsQueue } from "./AnalyticsEventsQueue";

/** Why a session or a participation ended. */
export type SessionEndReason = "closed" | "back_shutdown";

/**
 * What a row needs to name one person. The back sees a space through the pusher, not
 * through a socket: no member id, no tab, no IP — the admin takes all three as nullable.
 */
export type SessionMember = {
    uuid: string;
    spaceUserId: string;
    roomId: string;
};

/**
 * The one thing that differs between a meeting and a broadcast: how many ACTIVE members
 * it takes for the session to be open. Two people talking, or one person on air.
 *
 * In a meeting every present member is active. In a broadcast only the speakers are, so
 * a listener alone in the megaphone space accrues nothing — that room is where every
 * client of the world sits, and counting it would make "connected" mean "in a meeting".
 */
const MIN_ACTIVE: Record<SpaceKind, number> = { bubble: 2, area: 2, megaphone: 1, speaker_zone: 1 };

type Participation = {
    member: SessionMember;
    joinRank: number;
    startedAtMs: number;
    endedAtMs?: number;
    onAirSinceMs?: number;
    airtimeMs: number;
    spoke: boolean;
};

type Session = {
    kind: SpaceKind;
    openedAtMs: number;
    participations: Map<string, Participation>;
    present: number;
    peak: number;
};

/**
 * One row per session, and one per participation — emitted by the only party that can
 * count either honestly.
 *
 * Counted by the back rather than by each client: a client can only say what it believes
 * it is in, and a meeting of four reported by four clients is four rows, not one. Here a
 * session is a thing with a lifecycle: it opens when its predicate becomes true, closes
 * when it stops holding, and participations are clipped to it — a listener present
 * before anyone went on air starts at the open.
 *
 * Every row is emitted when the session CLOSES, participations included: a participation
 * cannot be emitted before we know the session it belongs to happened. A second session
 * in the same space is a second row under the same id, told apart by `startedAt`.
 *
 * One instance per space, owned by it, like RecordingManager — the other session this
 * back keeps. A space's sessions are its own, so there is nothing to key by and nothing
 * to register: the instance dies with the space that made it.
 */
export class SpaceSessionAnalytics {
    private readonly members = new Map<string, { member: SessionMember; active: boolean }>();
    private activeCount = 0;
    private session?: Session;
    /**
     * The room of whoever arrived first, for the row a session emits about nobody. A
     * space has no room of its own — every member carries theirs, and a space spans as
     * many rooms as the map has.
     */
    private roomId = "";

    public constructor(
        private readonly id: string,
        private readonly world: string,
        /**
         * Read when a session opens rather than once: the kind is the `spaceKind`
         * metadata, and it arrives after the first join. Undefined keeps the session
         * closed, so a space that never declares one never opens.
         */
        private readonly kind: () => SpaceKind | undefined,
        private readonly queue: Pick<AnalyticsEventsQueue, "enqueue"> = analyticsEventsQueue,
        private readonly nowMs: () => number = Date.now,
    ) {}

    /** The space learnt what it is: a session waiting on that may open now. */
    public kindChanged(): void {
        this.sync();
    }

    public join(member: SessionMember, active: boolean): void {
        if (this.members.has(member.spaceUserId)) {
            return;
        }
        if (this.roomId === "") {
            this.roomId = member.roomId;
        }
        this.members.set(member.spaceUserId, { member, active });
        if (active) {
            this.activeCount += 1;
        }
        if (this.session) {
            this.addParticipation(member.spaceUserId);
        }
        this.sync();
    }

    public setActive(key: string, active: boolean): void {
        const entry = this.members.get(key);
        if (!entry || entry.active === active) {
            return;
        }
        entry.active = active;
        this.activeCount += active ? 1 : -1;
        const participation = this.session?.participations.get(key);
        if (participation) {
            if (active) {
                this.goOnAir(participation);
            } else {
                this.goOffAir(participation);
            }
        }
        this.sync();
    }

    public leave(key: string): void {
        const entry = this.members.get(key);
        if (!entry) {
            return;
        }
        this.members.delete(key);
        if (entry.active) {
            this.activeCount -= 1;
        }
        const participation = this.session?.participations.get(key);
        if (this.session && participation && participation.endedAtMs === undefined) {
            this.goOffAir(participation);
            participation.endedAtMs = this.nowMs();
            this.session.present -= 1;
        }
        this.sync();
    }

    /**
     * Closes whatever is open — because the predicate stopped holding, because the space
     * is gone, or because the back is. Only enqueues. Members are kept: an area that
     * drops below two and fills up again opens a second session, which is a second row.
     *
     * Returns whether there was a session to close, which is what a shutdown counts.
     */
    public close(endReason: SessionEndReason = "closed"): boolean {
        const session = this.session;
        if (!session) {
            return false;
        }
        this.session = undefined;

        const endedAtMs = this.nowMs();
        const meeting = isMeetingKind(session.kind);
        const idKey = meeting ? "meetingId" : "broadcastId";
        const kindKey = meeting ? "meetingKind" : "broadcastKind";
        const interval = (startedAtMs: number, atMs: number) => ({
            startedAt: new Date(startedAtMs).toISOString(),
            endedAt: new Date(atMs).toISOString(),
            durationSeconds: Math.max(0, (atMs - startedAtMs) / 1000),
            endReason,
        });

        let speakerCount = 0;
        // Participations first, so none of them ends after the session containing it —
        // the admin drops an inner row whose end falls past its container's.
        for (const participation of session.participations.values()) {
            this.goOffAir(participation);
            const atMs = participation.endedAtMs ?? endedAtMs;
            if (participation.spoke) {
                speakerCount += 1;
            }
            this.queue.enqueue(
                this.row({
                    eventName: meeting ? "meeting.participation.ended" : "broadcast.participation.ended",
                    member: participation.member,
                    atMs,
                    eventId: `${this.id}:${session.openedAtMs}:${participation.member.spaceUserId}`,
                    properties: {
                        [idKey]: this.id,
                        [kindKey]: session.kind,
                        joinRank: participation.joinRank,
                        ...interval(participation.startedAtMs, atMs),
                        ...(meeting
                            ? {}
                            : {
                                  role: participation.spoke ? "speaker" : "listener",
                                  airtimeSeconds: participation.airtimeMs / 1000,
                              }),
                    },
                }),
            );
        }

        this.queue.enqueue(
            this.row({
                eventName: meeting ? "meeting.ended" : "broadcast.ended",
                // A session belongs to no one. The per-user view is the participation
                // row; attributing the session to one of its members would count the
                // whole thing as that person's.
                member: undefined,
                atMs: endedAtMs,
                eventId: `${this.id}:${session.openedAtMs}`,
                properties: {
                    [idKey]: this.id,
                    [kindKey]: session.kind,
                    participantCount: session.participations.size,
                    peakParticipantCount: session.peak,
                    ...interval(session.openedAtMs, endedAtMs),
                    ...(meeting ? {} : { speakerCount }),
                },
            }),
        );

        return true;
    }

    /** The predicate. Opening pulls every present member in; closing ends every participation. */
    private sync(): void {
        const kind = this.kind();
        const wanted = kind !== undefined && this.activeCount >= MIN_ACTIVE[kind];
        if (wanted && !this.session) {
            this.open(kind);
        } else if (!wanted && this.session) {
            this.close("closed");
        }
    }

    private open(kind: SpaceKind): void {
        this.session = {
            kind,
            openedAtMs: this.nowMs(),
            participations: new Map(),
            present: 0,
            peak: 0,
        };
        // Insertion order is arrival order, which is what joinRank means.
        for (const key of this.members.keys()) {
            this.addParticipation(key);
        }
    }

    private addParticipation(key: string): void {
        const session = this.session;
        const entry = this.members.get(key);
        if (!session || !entry) {
            return;
        }
        session.present += 1;
        session.peak = Math.max(session.peak, session.present);
        const participation: Participation = {
            member: entry.member,
            joinRank: session.participations.size + 1,
            startedAtMs: this.nowMs(),
            airtimeMs: 0,
            spoke: false,
        };
        if (entry.active) {
            this.goOnAir(participation);
        }
        session.participations.set(key, participation);
    }

    private goOnAir(participation: Participation): void {
        participation.onAirSinceMs ??= this.nowMs();
        participation.spoke = true;
    }

    private goOffAir(participation: Participation): void {
        if (participation.onAirSinceMs !== undefined) {
            participation.airtimeMs += this.nowMs() - participation.onAirSinceMs;
            participation.onAirSinceMs = undefined;
        }
    }

    private row(input: {
        eventName: string;
        member: SessionMember | undefined;
        atMs: number;
        eventId: string;
        properties: Record<string, unknown>;
    }): AnalyticsStoredEvent {
        const at = new Date(input.atMs).toISOString();

        return {
            eventName: input.eventName,
            // "pusher" means "a trusted server", which is what the admin gates on: the
            // value a socket may never claim.
            source: "pusher",
            // Both ends measured on the same clock, and it is the server's: nothing here
            // came from a browser, so there is no skew to clamp.
            clientEventTime: at,
            pusherReceivedAt: at,
            eventId: input.eventId,
            userUuid: input.member?.uuid ?? "",
            userId: null,
            spaceUserId: input.member?.spaceUserId ?? "",
            clientIp: null,
            world: this.world,
            roomId: input.member?.roomId ?? this.roomId,
            tabId: null,
            properties: input.properties,
        };
    }
}
