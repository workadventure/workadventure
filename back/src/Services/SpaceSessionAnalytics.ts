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

type TrackedSpace = {
    id: string;
    world: string;
    roomId: string;
    /**
     * Resolved when a session opens, not when the space is tracked: the kind is metadata,
     * and it arrives after the first join. Undefined keeps the session closed.
     */
    kind: () => SpaceKind | undefined;
    members: Map<string, { member: SessionMember; active: boolean }>;
    activeCount: number;
    session?: Session;
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
 */
export class SpaceSessionAnalytics {
    private readonly spaces = new Map<string, TrackedSpace>();

    public constructor(
        private readonly queue: Pick<AnalyticsEventsQueue, "enqueue"> = analyticsEventsQueue,
        private readonly nowMs: () => number = Date.now,
    ) {}

    /** Idempotent: the first call wins, later ones are free. */
    public track(id: string, world: string, roomId: string, kind: () => SpaceKind | undefined): void {
        if (!this.spaces.has(id)) {
            this.spaces.set(id, { id, world, roomId, kind, members: new Map(), activeCount: 0 });
        }
    }

    /** The space learnt what it is: a session waiting on that may open now. */
    public kindChanged(id: string): void {
        const space = this.spaces.get(id);
        if (space) {
            this.sync(space);
        }
    }

    /** The space is gone: close whatever is open and forget its members. */
    public untrack(id: string): void {
        const space = this.spaces.get(id);
        if (!space) {
            return;
        }
        this.spaces.delete(id);
        if (space.session) {
            this.close(space, "closed");
        }
    }

    public join(id: string, member: SessionMember, active: boolean): void {
        const space = this.spaces.get(id);
        if (!space || space.members.has(member.spaceUserId)) {
            return;
        }
        space.members.set(member.spaceUserId, { member, active });
        if (active) {
            space.activeCount += 1;
        }
        if (space.session) {
            this.addParticipation(space, member.spaceUserId);
        }
        this.sync(space);
    }

    public setActive(id: string, key: string, active: boolean): void {
        const space = this.spaces.get(id);
        const entry = space?.members.get(key);
        if (!space || !entry || entry.active === active) {
            return;
        }
        entry.active = active;
        space.activeCount += active ? 1 : -1;
        const participation = space.session?.participations.get(key);
        if (participation) {
            if (active) {
                this.goOnAir(participation);
            } else {
                this.goOffAir(participation);
            }
        }
        this.sync(space);
    }

    public leave(id: string, key: string): void {
        const space = this.spaces.get(id);
        const entry = space?.members.get(key);
        if (!space || !entry) {
            return;
        }
        space.members.delete(key);
        if (entry.active) {
            space.activeCount -= 1;
        }
        const participation = space.session?.participations.get(key);
        if (space.session && participation && participation.endedAtMs === undefined) {
            this.goOffAir(participation);
            participation.endedAtMs = this.nowMs();
            space.session.present -= 1;
        }
        this.sync(space);
    }

    /** Closes every open session, for a graceful shutdown. Only enqueues. */
    public closeAll(): number {
        let closed = 0;
        for (const space of this.spaces.values()) {
            if (space.session) {
                this.close(space, "back_shutdown");
                closed += 1;
            }
        }
        return closed;
    }

    /** The predicate. Opening pulls every present member in; closing ends every participation. */
    private sync(space: TrackedSpace): void {
        const kind = space.kind();
        const wanted = kind !== undefined && space.activeCount >= MIN_ACTIVE[kind];
        if (wanted && !space.session) {
            this.open(space, kind);
        } else if (!wanted && space.session) {
            this.close(space, "closed");
        }
    }

    private open(space: TrackedSpace, kind: SpaceKind): void {
        space.session = {
            kind,
            openedAtMs: this.nowMs(),
            participations: new Map(),
            present: 0,
            peak: 0,
        };
        // Insertion order is arrival order, which is what joinRank means.
        for (const key of space.members.keys()) {
            this.addParticipation(space, key);
        }
    }

    private addParticipation(space: TrackedSpace, key: string): void {
        const session = space.session;
        const entry = space.members.get(key);
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

    private close(space: TrackedSpace, endReason: SessionEndReason): void {
        const session = space.session;
        if (!session) {
            return;
        }
        space.session = undefined;

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
                    space,
                    member: participation.member,
                    atMs,
                    eventId: `${space.id}:${session.openedAtMs}:${participation.member.spaceUserId}`,
                    properties: {
                        [idKey]: space.id,
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
                space,
                // A session belongs to no one. The per-user view is the participation
                // row; attributing the session to one of its members would count the
                // whole thing as that person's.
                member: undefined,
                atMs: endedAtMs,
                eventId: `${space.id}:${session.openedAtMs}`,
                properties: {
                    [idKey]: space.id,
                    [kindKey]: session.kind,
                    participantCount: session.participations.size,
                    peakParticipantCount: session.peak,
                    ...interval(session.openedAtMs, endedAtMs),
                    ...(meeting ? {} : { speakerCount }),
                },
            }),
        );
    }

    private row(input: {
        eventName: string;
        space: TrackedSpace;
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
            world: input.space.world,
            roomId: input.member?.roomId ?? input.space.roomId,
            tabId: null,
            properties: input.properties,
        };
    }
}

export const spaceSessionAnalytics = new SpaceSessionAnalytics();
