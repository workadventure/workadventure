import { describe, expect, it, vi, type Mock } from "vitest";
import type { AnalyticsStoredEvent } from "@workadventure/messages";
import { SpaceSessionAnalytics, type SessionKind, type SessionMember } from "../src/Services/SpaceSessionAnalytics";

type Enqueue = Mock<(row: AnalyticsStoredEvent) => void>;

const member = (id: string): SessionMember => ({
    key: `room_${id}`,
    uuid: `uuid-${id}`,
    spaceUserId: `room_${id}`,
    roomId: "https://play.example/room",
});

const rowsOf = (enqueue: Enqueue): AnalyticsStoredEvent[] => enqueue.mock.calls.map(([row]) => row);

const harness = (kind: SessionKind) => {
    const enqueue: Enqueue = vi.fn();
    let now = Date.parse("2026-04-24T12:00:00.000Z");
    const analytics = new SpaceSessionAnalytics({ enqueue }, () => now);
    analytics.track("space", "world", "https://play.example/room", () => kind);
    const tick = (seconds: number) => {
        now += seconds * 1000;
    };
    return { analytics, enqueue, tick };
};

describe("SpaceSessionAnalytics", () => {
    it("reports one meeting and three participations for a bubble of three", () => {
        const { analytics, enqueue, tick } = harness("bubble");

        analytics.join("space", member("1"), true);
        analytics.join("space", member("2"), true);
        tick(60);
        analytics.join("space", member("3"), true);
        tick(60);
        analytics.untrack("space");

        const rows = rowsOf(enqueue);
        const participations = rows.filter((row) => row.eventName === "meeting.participation.ended");
        const meetings = rows.filter((row) => row.eventName === "meeting.ended");

        expect(meetings).toHaveLength(1);
        expect(meetings[0].userUuid).toBe("");
        expect(meetings[0].properties).toMatchObject({
            meetingId: "space",
            meetingKind: "bubble",
            participantCount: 3,
            peakParticipantCount: 3,
            durationSeconds: 120,
            endReason: "closed",
        });
        expect(participations.map((row) => row.properties.joinRank)).toEqual([1, 2, 3]);
        expect(participations.map((row) => row.properties.durationSeconds)).toEqual([120, 120, 60]);
        expect(participations.map((row) => row.userUuid)).toEqual(["uuid-1", "uuid-2", "uuid-3"]);
        expect(participations.every((row) => row.properties.meetingId === "space")).toBe(true);
    });

    it("never lets a participation end after the meeting holding it", () => {
        const { analytics, enqueue, tick } = harness("bubble");

        analytics.join("space", member("1"), true);
        analytics.join("space", member("2"), true);
        analytics.join("space", member("3"), true);
        tick(30);
        analytics.leave("space", "room_1");
        tick(30);
        analytics.untrack("space");

        const rows = rowsOf(enqueue);
        expect(rows[0].properties.endedAt).toBe("2026-04-24T12:00:30.000Z");
        expect(rows.at(-1)?.eventName).toBe("meeting.ended");
    });

    it("reports nothing for an area one person visited", () => {
        const { analytics, enqueue, tick } = harness("area");

        analytics.join("space", member("1"), true);
        tick(600);
        analytics.leave("space", "room_1");
        analytics.untrack("space");

        expect(enqueue).not.toHaveBeenCalled();
    });

    it("opens an area meeting on the second arrival, closes it below two, and reopens as a new one", () => {
        const { analytics, enqueue, tick } = harness("area");

        analytics.join("space", member("1"), true);
        tick(10);
        analytics.join("space", member("2"), true);
        tick(30);
        analytics.leave("space", "room_2");
        tick(60);
        analytics.join("space", member("3"), true);
        tick(30);
        analytics.untrack("space");

        const rows = rowsOf(enqueue);
        const meetings = rows.filter((row) => row.eventName === "meeting.ended");
        expect(meetings).toHaveLength(2);
        expect(new Set(meetings.map((row) => row.eventId)).size).toBe(2);
        expect(meetings[0].properties).toMatchObject({ startedAt: "2026-04-24T12:00:10.000Z", durationSeconds: 30 });

        const first = rows.filter((row) => row.userUuid === "uuid-1");
        expect(first).toHaveLength(2);
        expect(first.map((row) => row.properties.joinRank)).toEqual([1, 1]);
        // Present before the meeting opened: clipped to it.
        expect(first[0].properties).toMatchObject({ startedAt: "2026-04-24T12:00:10.000Z", durationSeconds: 30 });
    });

    it("opens a broadcast on the first speaker, clips the audience to it, and ends it on the last off-air", () => {
        const { analytics, enqueue, tick } = harness("speaker_zone");

        analytics.join("space", member("listener"), false);
        tick(10);
        analytics.join("space", member("speaker"), false);
        tick(10);
        analytics.setActive("space", "room_speaker", true);
        tick(30);
        analytics.setActive("space", "room_speaker", false);

        const rows = rowsOf(enqueue);
        const broadcasts = rows.filter((row) => row.eventName === "broadcast.ended");
        expect(broadcasts).toHaveLength(1);
        expect(broadcasts[0].userUuid).toBe("");
        expect(broadcasts[0].properties).toMatchObject({
            broadcastId: "space",
            broadcastKind: "speaker_zone",
            participantCount: 2,
            speakerCount: 1,
            startedAt: "2026-04-24T12:00:20.000Z",
            durationSeconds: 30,
        });

        const byUuid = Object.fromEntries(
            rows.filter((row) => row.eventName === "broadcast.participation.ended").map((row) => [row.userUuid, row]),
        );
        expect(byUuid["uuid-listener"].properties).toMatchObject({
            role: "listener",
            airtimeSeconds: 0,
            joinRank: 1,
            startedAt: "2026-04-24T12:00:20.000Z",
            durationSeconds: 30,
        });
        expect(byUuid["uuid-speaker"].properties).toMatchObject({ role: "speaker", airtimeSeconds: 30, joinRank: 2 });
    });

    it("sums a speaker's airtime across their stints", () => {
        const { analytics, enqueue, tick } = harness("megaphone");

        analytics.join("space", member("s1"), true);
        analytics.join("space", member("s2"), true);
        tick(10);
        analytics.setActive("space", "room_s1", false);
        tick(10);
        analytics.setActive("space", "room_s1", true);
        tick(10);
        analytics.untrack("space");

        const rows = rowsOf(enqueue);
        const s1 = rows.find((row) => row.userUuid === "uuid-s1");
        expect(s1?.properties).toMatchObject({ role: "speaker", airtimeSeconds: 20, durationSeconds: 30 });
        expect(rows.at(-1)?.properties).toMatchObject({ broadcastKind: "megaphone", speakerCount: 2 });
    });

    it("reads the kind when the session opens, not when the space is tracked", () => {
        const enqueue: Enqueue = vi.fn();
        const analytics = new SpaceSessionAnalytics({ enqueue }, () => 0);
        let kind: SessionKind = "speaker_zone";
        analytics.track("space", "world", "room", () => kind);

        analytics.join("space", member("s"), false);
        kind = "megaphone";
        analytics.setActive("space", "room_s", true);
        analytics.setActive("space", "room_s", false);

        expect(rowsOf(enqueue).every((row) => row.properties.broadcastKind === "megaphone")).toBe(true);
    });

    it("closes every open session on shutdown and says so", () => {
        const enqueue: Enqueue = vi.fn();
        const analytics = new SpaceSessionAnalytics({ enqueue }, () => 0);
        analytics.track("bubble", "world", "room", () => "bubble");
        analytics.track("megaphone", "world", "room", () => "megaphone");
        analytics.track("idle", "world", "room", () => "area");
        analytics.join("bubble", member("1"), true);
        analytics.join("bubble", member("2"), true);
        analytics.join("megaphone", member("s"), true);
        analytics.join("idle", member("3"), true);

        expect(analytics.closeAll("back_shutdown")).toBe(2);
        const rows = rowsOf(enqueue);
        expect(rows).toHaveLength(5);
        expect(rows.every((row) => row.properties.endReason === "back_shutdown")).toBe(true);
    });
});
