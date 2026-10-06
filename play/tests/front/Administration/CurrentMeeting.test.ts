import { afterEach, describe, expect, it } from "vitest";
import { FilterType } from "@workadventure/messages";
import {
    liveMeetingContexts,
    meetingEnded,
    meetingOf,
    meetingStarted,
    openTimedEventPerMeeting,
} from "../../../src/front/Administration/CurrentMeeting";
import type { SpaceInterface } from "../../../src/front/Space/SpaceInterface";

describe("CurrentMeeting", () => {
    afterEach(() => {
        for (const context of liveMeetingContexts()) {
            if (context.meetingId) {
                meetingEnded(context.meetingId);
            }
        }
    });

    it("names every meeting a period opening now belongs to, and one empty context outside any", () => {
        expect(liveMeetingContexts()).toEqual([{}]);

        meetingStarted("bubble-1");
        meetingStarted("area-2");
        meetingStarted("area-2");
        expect(liveMeetingContexts()).toEqual([{ meetingId: "bubble-1" }, { meetingId: "area-2" }]);

        // A bubble dissolving just after a meeting area was entered leaves the area.
        meetingEnded("bubble-1");
        expect(liveMeetingContexts()).toEqual([{ meetingId: "area-2" }]);

        meetingEnded("area-2");
        expect(liveMeetingContexts()).toEqual([{}]);
    });

    it("keeps one open interval per live meeting, cut at every boundary", () => {
        const opened: string[] = [];
        const closed: string[] = [];
        const end = openTimedEventPerMeeting((context) => {
            const key = context.meetingId ?? "outside";
            opened.push(key);
            return () => closed.push(key);
        });
        expect(opened).toEqual(["outside"]);

        meetingStarted("bubble-1");
        expect(closed).toEqual(["outside"]);
        expect(opened).toEqual(["outside", "bubble-1"]);

        meetingStarted("area-2");
        expect(opened).toEqual(["outside", "bubble-1", "area-2"]);
        expect(closed).toEqual(["outside"]);

        meetingEnded("bubble-1");
        expect(closed).toEqual(["outside", "bubble-1"]);

        meetingEnded("area-2");
        expect(closed).toEqual(["outside", "bubble-1", "area-2"]);
        expect(opened).toEqual(["outside", "bubble-1", "area-2", "outside"]);

        end();
        end();
        expect(closed).toEqual(["outside", "bubble-1", "area-2", "outside"]);
        meetingStarted("area-3");
        expect(opened).toHaveLength(4);
    });

    it("attributes a participant action to a conversation space and to no broadcast", () => {
        const space = (filterType: FilterType): SpaceInterface =>
            ({ filterType, getName: () => "space" }) as unknown as SpaceInterface;

        expect(meetingOf(space(FilterType.ALL_USERS))).toEqual({ meetingId: "space" });
        expect(meetingOf(space(FilterType.LIVE_STREAMING_USERS))).toEqual({});
    });
});
