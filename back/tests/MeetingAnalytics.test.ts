import { describe, expect, it, vi } from "vitest";
import type { AnalyticsStoredEvent } from "@workadventure/messages";
import { MeetingAnalytics, type MeetingParticipant } from "../src/Services/MeetingAnalytics";

function participant(id: number): MeetingParticipant {
    return {
        key: String(id),
        uuid: `uuid-${id}`,
        userId: id,
        spaceUserId: `room_${id}`,
        roomId: "https://play.test/@/team/world/room",
        tabId: `tab-${id}`,
        clientIp: "203.0.113.10",
    };
}

function rowsOf(enqueue: ReturnType<typeof vi.fn>): AnalyticsStoredEvent[] {
    return enqueue.mock.calls.map(([row]) => row as AnalyticsStoredEvent);
}

describe("MeetingAnalytics", () => {
    it("reports a meeting of three as one meeting and three participations", () => {
        const enqueue = vi.fn();
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const analytics = new MeetingAnalytics({ enqueue }, () => now);

        analytics.meetingStarted("bubble-1", "world", "room", "bubble");
        analytics.participantJoined("bubble-1", participant(1));
        analytics.participantJoined("bubble-1", participant(2));
        now += 60_000;
        analytics.participantJoined("bubble-1", participant(3));
        now += 60_000;
        analytics.meetingEnded("bubble-1");

        const rows = rowsOf(enqueue);
        const meetings = rows.filter((row) => row.eventName === "meeting.ended");
        const participations = rows.filter((row) => row.eventName === "meeting.participation.ended");

        // The whole point: one row for the meeting, whatever the head count. Four
        // clients used to report four meetings of the same conversation.
        expect(meetings).toHaveLength(1);
        expect(participations).toHaveLength(3);
        expect(meetings[0].properties).toMatchObject({
            meetingKind: "bubble",
            participantCount: 3,
            peakParticipantCount: 3,
            durationSeconds: 120,
        });
        // A meeting is attributed to nobody; the per-user view is the participation.
        expect(meetings[0].userUuid).toBe("");
        expect(participations.map((row) => row.properties.durationSeconds)).toEqual([120, 120, 60]);
        expect(participations.map((row) => row.properties.joinRank)).toEqual([1, 2, 3]);
    });

    it("keeps a participation inside the meeting that contains it", () => {
        const enqueue = vi.fn();
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const analytics = new MeetingAnalytics({ enqueue }, () => now);

        analytics.meetingStarted("bubble-1", "world", "room", "bubble");
        analytics.participantJoined("bubble-1", participant(1));
        analytics.participantJoined("bubble-1", participant(2));
        now += 30_000;
        analytics.participantLeft("bubble-1", "1");
        now += 30_000;
        analytics.meetingEnded("bubble-1");

        const rows = rowsOf(enqueue);
        // Emitted at the end, but timed at the leave: the admin drops an inner row
        // whose end falls past its container's, so the order of emission has to match
        // the order of the timestamps.
        expect(rows[0].properties.endedAt).toBe("2026-04-24T12:00:30.000Z");
        expect(rows[rows.length - 1].eventName).toBe("meeting.ended");
    });

    it("reports nothing for an area nobody else ever joined", () => {
        const enqueue = vi.fn();
        let now = Date.parse("2026-04-24T12:00:00.000Z");
        const analytics = new MeetingAnalytics({ enqueue }, () => now);

        // One person standing in a meeting area is standing in a room. Counting it
        // would be the megaphone mistake again: a configured area manufacturing
        // conversation time for anyone who walks through it.
        analytics.meetingStarted("area-1", "world", "room", "area");
        analytics.participantJoined("area-1", participant(1));
        now += 600_000;
        analytics.participantLeft("area-1", "1");
        analytics.meetingEnded("area-1");

        expect(enqueue).not.toHaveBeenCalled();
    });

    it("closes what is still open when the process goes down", () => {
        const enqueue = vi.fn();
        const analytics = new MeetingAnalytics({ enqueue }, () => Date.parse("2026-04-24T12:00:00.000Z"));

        analytics.meetingStarted("bubble-1", "world", "room", "bubble");
        analytics.participantJoined("bubble-1", participant(1));
        analytics.participantJoined("bubble-1", participant(2));

        expect(analytics.closeAll("back_shutdown")).toBe(1);
        expect(rowsOf(enqueue).every((row) => row.properties.endReason === "back_shutdown")).toBe(true);
    });
});
