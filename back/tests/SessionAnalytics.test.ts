import { describe, expect, it, vi, type Mock } from "vitest";
import type { AnalyticsStoredEvent, SpaceKind } from "@workadventure/messages";
import { SessionAnalytics, type SessionMember } from "../src/Model/SessionAnalytics";

type Enqueue = Mock<(row: AnalyticsStoredEvent) => void>;

const member = (id: string): SessionMember => ({
    uuid: `uuid-${id}`,
    spaceUserId: `room_${id}`,
    roomId: "https://play.example/room",
});

const rowsOf = (enqueue: Enqueue): AnalyticsStoredEvent[] => enqueue.mock.calls.map(([row]) => row);

const harness = (kind: SpaceKind) => {
    const enqueue: Enqueue = vi.fn();
    let now = Date.parse("2026-04-24T12:00:00.000Z");
    const analytics = new SessionAnalytics("space", "world", () => kind, { enqueue }, () => now);
    const tick = (seconds: number) => {
        now += seconds * 1000;
    };
    return { analytics, enqueue, tick };
};

describe("SessionAnalytics", () => {
    it("reports one meeting and three participations for a bubble of three", () => {
        const { analytics, enqueue, tick } = harness("bubble");

        analytics.join(member("1"), true);
        analytics.join(member("2"), true);
        tick(60);
        analytics.join(member("3"), true);
        tick(60);
        analytics.close();

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

        analytics.join(member("1"), true);
        analytics.join(member("2"), true);
        analytics.join(member("3"), true);
        tick(30);
        analytics.leave("room_1");
        tick(30);
        analytics.close();

        const rows = rowsOf(enqueue);
        expect(rows[0].properties.endedAt).toBe("2026-04-24T12:00:30.000Z");
        expect(rows.at(-1)?.eventName).toBe("meeting.ended");
    });

    it("reports nothing for an area one person visited", () => {
        const { analytics, enqueue, tick } = harness("area");

        analytics.join(member("1"), true);
        tick(600);
        analytics.leave("room_1");
        analytics.close();

        expect(enqueue).not.toHaveBeenCalled();
    });

    it("opens an area meeting on the second arrival, closes it below two, and reopens as a new one", () => {
        const { analytics, enqueue, tick } = harness("area");

        analytics.join(member("1"), true);
        tick(10);
        analytics.join(member("2"), true);
        tick(30);
        analytics.leave("room_2");
        tick(60);
        analytics.join(member("3"), true);
        tick(30);
        analytics.close();

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

        analytics.join(member("listener"), false);
        tick(10);
        analytics.join(member("speaker"), false);
        tick(10);
        analytics.setActive("room_speaker", true);
        tick(30);
        analytics.setActive("room_speaker", false);

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

        analytics.join(member("s1"), true);
        analytics.join(member("s2"), true);
        tick(10);
        analytics.setActive("room_s1", false);
        tick(10);
        analytics.setActive("room_s1", true);
        tick(10);
        analytics.close();

        const rows = rowsOf(enqueue);
        const s1 = rows.find((row) => row.userUuid === "uuid-s1");
        expect(s1?.properties).toMatchObject({ role: "speaker", airtimeSeconds: 20, durationSeconds: 30 });
        expect(rows.at(-1)?.properties).toMatchObject({ broadcastKind: "megaphone", speakerCount: 2 });
    });

    it("waits for the space to say what it is before opening anything", () => {
        const enqueue: Enqueue = vi.fn();
        let now = 0;
        let kind: SpaceKind | undefined = undefined;
        const analytics = new SessionAnalytics("space", "world", () => kind, { enqueue }, () => now);

        // Two people met before either declared the space: nothing opens yet.
        analytics.join(member("1"), true);
        analytics.join(member("2"), true);
        now = 5_000;
        kind = "bubble";
        analytics.kindChanged();
        now = 65_000;
        analytics.close();

        const meeting = rowsOf(enqueue).find((row) => row.eventName === "meeting.ended");
        expect(meeting?.properties).toMatchObject({ meetingKind: "bubble", durationSeconds: 60, participantCount: 2 });
    });

    it("closes an open session on shutdown and says whether there was one", () => {
        // SocketManager runs this over every space and adds up the answers, so what one
        // space owes it is a truthful yes/no — an idle space must not inflate the count.
        const enqueue: Enqueue = vi.fn();
        const open = new SessionAnalytics("bubble", "world", () => "bubble", { enqueue }, () => 0);
        open.join(member("1"), true);
        open.join(member("2"), true);
        const idle = new SessionAnalytics("idle", "world", () => "area", { enqueue }, () => 0);
        idle.join(member("3"), true);

        expect(idle.close("back_shutdown")).toBe(false);
        expect(open.close("back_shutdown")).toBe(true);

        const rows = rowsOf(enqueue);
        expect(rows).toHaveLength(3);
        expect(rows.every((row) => row.properties.endReason === "back_shutdown")).toBe(true);
    });

    it("stays shut once closed, so a shutdown after a destroy emits nothing twice", () => {
        const { analytics, enqueue } = harness("bubble");

        analytics.join(member("1"), true);
        analytics.join(member("2"), true);

        expect(analytics.close()).toBe(true);
        expect(analytics.close("back_shutdown")).toBe(false);
        expect(rowsOf(enqueue)).toHaveLength(3);
    });
});
