import { describe, expect, it } from "vitest";
import {
    currentMeetingProperties,
    meetingEnded,
    meetingStarted,
} from "../../../src/front/Administration/CurrentMeeting";

describe("CurrentMeeting", () => {
    it("names the meeting a period opening now belongs to, and nothing outside one", () => {
        expect(currentMeetingProperties()).toEqual({});

        meetingStarted("bubble-1");
        expect(currentMeetingProperties()).toEqual({ meetingId: "bubble-1" });

        meetingEnded("bubble-1");
        expect(currentMeetingProperties()).toEqual({});
    });

    it("lets the live meeting stand when a previous one closes late", () => {
        // A bubble dissolving just after a meeting area was entered: unguarded, its
        // close would erase the meeting the user is actually in.
        meetingStarted("bubble-1");
        meetingStarted("area-2");
        meetingEnded("bubble-1");

        expect(currentMeetingProperties()).toEqual({ meetingId: "area-2" });

        meetingEnded("area-2");
        expect(currentMeetingProperties()).toEqual({});
    });
});
