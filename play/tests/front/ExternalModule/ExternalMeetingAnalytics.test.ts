import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "../../../src/front/Administration/AnalyticsClient";
import { currentMeetingProperties } from "../../../src/front/Administration/CurrentMeeting";
import {
    clearExternalMeetings,
    externalMeetingEnded,
    externalMeetingStarted,
} from "../../../src/front/ExternalModule/ExternalMeetingAnalytics";

describe("ExternalMeetingAnalytics", () => {
    let opened: { name: string; properties: Record<string, unknown> }[];
    let closed: number;

    beforeEach(() => {
        opened = [];
        closed = 0;
        vi.spyOn(analyticsClient, "trackAdminEvent").mockImplementation(() => undefined);
        vi.spyOn(analyticsClient, "openTimedEvent").mockImplementation((name, properties) => {
            opened.push({ name, properties: properties });

            return () => {
                closed += 1;
            };
        });
    });

    afterEach(() => {
        clearExternalMeetings();
        vi.restoreAllMocks();
    });

    it("reports a Teams area as an external meeting", () => {
        externalMeetingStarted("teams", "area-1", "https://play.test/@/team/world/room");

        expect(opened).toEqual([
            {
                name: "meeting.ended",
                properties: { meetingProvider: "teams", meetingKind: "external", meetingId: "area-1" },
            },
        ]);
        // The periods this client reports for itself have to name the meeting too.
        expect(currentMeetingProperties()).toEqual({ meetingId: "area-1" });

        externalMeetingEnded("teams");
        expect(closed).toBe(1);
        expect(currentMeetingProperties()).toEqual({});
    });

    it("says nothing for a module whose areas are not meetings we can name", () => {
        // A module declaring a meeting area under a subtype with no provider: an
        // unattributable row in the meeting series is worse than none, and area.dwell
        // still measures the visit.
        externalMeetingStarted("some-other-module", "area-2", "https://play.test/@/team/world/room");

        expect(opened).toEqual([]);
        expect(currentMeetingProperties()).toEqual({});
    });

    it("does not leave the previous meeting open when a leave is missed", () => {
        externalMeetingStarted("google", "area-1", "https://play.test/@/team/world/room");
        externalMeetingStarted("google", "area-2", "https://play.test/@/team/world/room");

        expect(closed).toBe(1);
        expect(opened.map((event) => event.properties.meetingId)).toEqual(["area-1", "area-2"]);
        expect(opened[1].properties.meetingProvider).toBe("google_meet");
    });
});
