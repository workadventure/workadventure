import type { AnalyticsStoredEvent } from "@workadventure/messages";
import type { AnalyticsEventsQueue } from "@workadventure/shared-utils";
import { analyticsEventsQueue } from "./AnalyticsEventsQueue";

/**
 * What a space is a session of. A bubble and an area are meetings; the megaphone space
 * and a speaker zone are broadcasts. Decided from what the space IS — its filter, its
 * name, its metadata — never from how its media happened to be carried.
 */
export type SessionKind = "bubble" | "area" | "megaphone" | "speaker_zone";

/** Why a session or a participation ended. */
export type SessionEndReason = "closed" | "back_shutdown";

/**
 * What a row needs to name one person. The back sees a space through the pusher, not
 * through a socket: no member id, no tab, no IP — the admin takes all three as nullable.
 */
export type SessionMember = {
    /** Dedupe key, stable for the length of the membership. */
    key: string;
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
 * client of the world sits, and counting it made "connected" mean "in a meeting".
 */
const MIN_ACTIVE: Record<SessionKind, number> = { bubble: 2, area: 2, megaphone: 1, speaker_zone: 1 };

const isMeeting = (kind: SessionKind): boolean => kind === "bubble" || kind === "area";

/**
 * A bubble is known by its name: `Group` mints `${roomId}#${id}#${timestamp}` and the
 * pusher only prefixes the world. Lives here rather than next to `Group` so `Space`
 * does not have to import the whole game-room graph for one regex.
 */
export const isBubbleSpaceName = (name: string): boolean => /#\d+#\d+$/.test(name);

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
    kind: SessionKind;
    openedAtMs: number;
    participations: Map<string, Participation>;
    seen: number;
    present: number;
    peak: number;
};

type TrackedSpace = {
    id: string;
    world: string;
    roomId: string;
    /** Resolved when a session opens, not when the space is tracked: a broadcast's kind lives in metadata that arrives after the first join. */
    kind: () => SessionKind;
    members: Map<string, { member: SessionMember; active: boolean }>;
    activeCount: number;
    session?: Session;
};

/**
 * One row per session, and one per participation — emitted by the only party that can
 * count either honestly.
 *
 * Every participant's client used to open its own interval, so a meeting of four
 * produced four rows and a broadcast was measured once per listener. Here a session is
 * a thing with a lifecycle rather than a thing each client believes it is in: it opens
 * when its predicate becomes true, closes when it stops holding, and participations are
 * clipped to it — a listener present before anyone went on air starts at the open.
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
    public track(id: string, world: string, roomId: string, kind: () => SessionKind): void {
        if (!this.spaces.has(id)) {
            this.spaces.set(id, { id, world, roomId, kind, members: new Map(), activeCount: 0 });
        }
    }

    /** The space is gone: close whatever is open and forget its members. */
    public untrack(id: string, endReason: SessionEndReason = "closed"): void {
        const space = this.spaces.get(id);
        if (!space) {
            return;
        }
        this.spaces.delete(id);
        if (space.session) {
            this.close(space, endReason);
        }
    }

    public join(id: string, member: SessionMember, active: boolean): void {
        const space = this.spaces.get(id);
        if (!space || space.members.has(member.key)) {
            return;
        }
        space.members.set(member.key, { member, active });
        if (active) {
            space.activeCount += 1;
        }
        if (space.session) {
            this.addParticipation(space, member.key);
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
    public closeAll(endReason: SessionEndReason = "back_shutdown"): number {
        let closed = 0;
        for (const space of this.spaces.values()) {
            if (space.session) {
                this.close(space, endReason);
                closed += 1;
            }
        }
        return closed;
    }

    /** The predicate. Opening pulls every present member in; closing ends every participation. */
    private sync(space: TrackedSpace): void {
        const wanted = space.activeCount >= MIN_ACTIVE[space.kind()];
        if (wanted && !space.session) {
            this.open(space);
        } else if (!wanted && space.session) {
            this.close(space, "closed");
        }
    }

    private open(space: TrackedSpace): void {
        space.session = {
            kind: space.kind(),
            openedAtMs: this.nowMs(),
            participations: new Map(),
            seen: 0,
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
        session.seen += 1;
        session.present += 1;
        session.peak = Math.max(session.peak, session.present);
        const participation: Participation = {
            member: entry.member,
            joinRank: session.seen,
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
        const meeting = isMeeting(session.kind);
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
                    eventId: `${space.id}:${session.openedAtMs}:${participation.member.key}`,
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
                    participantCount: session.seen,
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
            // value a socket may never claim. A dedicated "back" would say more, but it
            // is a JsonMessages edit, and that bumps apiVersionHash — a forced reload of
            // every connected front, to relabel rows nothing reads by source.
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
