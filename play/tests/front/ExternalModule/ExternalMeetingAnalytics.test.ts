import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsClient } from "../../../src/front/Administration/AnalyticsClient";
import { liveMeetingContexts } from "../../../src/front/Administration/CurrentMeeting";
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

    it("reports an external area under the name its module declares", () => {
        externalMeetingStarted("teams", "area-1", "https://play.test/@/team/world/room");

        expect(opened).toEqual([
            {
                name: "meeting.ended",
                properties: {
                    meetingProvider: "external",
                    externalMeetingProviderName: "teams",
                    meetingKind: "external",
                    meetingId: "area-1",
                },
            },
        ]);
        // The periods this client reports for itself have to name the meeting too.
        expect(liveMeetingContexts()).toEqual([{ meetingId: "area-1" }]);

        externalMeetingEnded("teams");
        expect(closed).toBe(1);
        // Outside any meeting the context list is one empty entry, not an empty list:
        // a row is still emitted, it just names no meeting. See liveMeetingContexts.
        expect(liveMeetingContexts()).toEqual([{}]);
    });

    it("reports a module it has never heard of, rather than dropping it", () => {
        // Which extensions exist is not this module's business. A list of the ones we
        // happen to know would silently stop measuring the next one written.
        externalMeetingStarted("some-other-module", "area-2", "https://play.test/@/team/world/room");

        expect(opened).toEqual([
            {
                name: "meeting.ended",
                properties: {
                    meetingProvider: "external",
                    externalMeetingProviderName: "some-other-module",
                    meetingKind: "external",
                    meetingId: "area-2",
                },
            },
        ]);
        expect(liveMeetingContexts()).toEqual([{ meetingId: "area-2" }]);
    });

    it("does not leave the previous meeting open when a leave is missed", () => {
        externalMeetingStarted("google", "area-1", "https://play.test/@/team/world/room");
        externalMeetingStarted("google", "area-2", "https://play.test/@/team/world/room");

        expect(closed).toBe(1);
        expect(opened.map((event) => event.properties.meetingId)).toEqual(["area-1", "area-2"]);
        expect(opened[1].properties.externalMeetingProviderName).toBe("google");
    });
});
