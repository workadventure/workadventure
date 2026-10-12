import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { describe, expect, it } from "vitest";

import {
    buildAgenda,
    meetingsInProgress,
    nextMeeting,
    overlapsWith,
} from "../../../../src/front/Components/Calendar/agenda";

// Local times on purpose: the agenda groups by the user's local day.
const NOW = new Date(2026, 9, 12, 17, 5);

function event(id: string, start: string, end: string, extra: Partial<CalendarEventInterface> = {}) {
    const at = (time: string, day = 12) => {
        const [hours, minutes] = time.split(":").map(Number);
        return new Date(2026, 9, day, hours, minutes);
    };
    const [startTime, startDay] = start.split("+");
    const [endTime, endDay] = end.split("+");
    return {
        id,
        title: id,
        description: "",
        start: at(startTime, 12 + Number(startDay ?? 0)),
        end: at(endTime, 12 + Number(endDay ?? 0)),
        ...extra,
    } satisfies CalendarEventInterface;
}

const ids = (events: CalendarEventInterface[]) => events.map((e) => e.id);

describe("buildAgenda", () => {
    it("sorts the events whatever order the provider gave them in", () => {
        const [day] = buildAgenda(
            [event("c", "20:00", "20:30"), event("a", "18:00", "18:30"), event("b", "19:00", "19:15")],
            NOW,
        );
        expect(day.items.map((item) => (item.kind === "event" ? item.event.id : item.kind))).toEqual(["a", "b", "c"]);
    });

    it("groups the events by local day, today first", () => {
        const days = buildAgenda([event("tomorrow", "09:30+1", "10:00+1"), event("today", "18:00", "18:30")], NOW);
        expect(days.map((day) => day.date.getDate())).toEqual([12, 13]);
        expect(days.map((day) => day.count)).toEqual([1, 1]);
    });

    it("drops finished meetings but keeps the one in progress", () => {
        const [day] = buildAgenda([event("done", "16:00", "17:00"), event("running", "17:00", "17:30")], NOW);
        expect(day.items.map((item) => (item.kind === "event" ? item.event.id : item.kind))).toEqual(["running"]);
        expect(day.count).toBe(1);
    });

    it("keeps a meeting started yesterday and still running in today", () => {
        const [day] = buildAgenda([event("night", "23:00+-1", "18:00")], NOW);
        expect(day.date.getDate()).toBe(12);
    });

    it("groups meetings that overlap into one run, and leaves back-to-back ones apart", () => {
        const [day] = buildAgenda(
            [
                event("a", "18:00", "18:30"),
                event("b", "18:15", "19:15"),
                event("c", "18:30", "19:00"),
                event("d", "19:00", "19:15"),
                event("e", "19:15", "19:45"),
            ],
            NOW,
        );
        expect(day.items).toHaveLength(2);
        const [run, after] = day.items;
        expect(run.kind).toBe("overlap");
        expect(run.kind === "overlap" && ids(run.events)).toEqual(["a", "b", "c", "d"]);
        expect(run.kind === "overlap" && run.end).toEqual(event("x", "19:15", "19:15").end);
        expect(after.kind === "event" && after.event.id).toBe("e");
    });

    it("sets all-day and long events apart from the runs", () => {
        const [day] = buildAgenda(
            [
                event("offsite", "00:00", "00:00+1", { allDay: true }),
                event("hackathon", "17:45", "21:45"),
                event("a", "18:00", "18:30"),
            ],
            NOW,
        );
        expect(ids(day.allDay)).toEqual(["offsite"]);
        expect(day.items.map((item) => item.kind)).toEqual(["long", "event"]);
        expect(day.count).toBe(3);
    });
});

describe("nextMeeting", () => {
    it("prefers the meeting in progress", () => {
        const next = nextMeeting([event("later", "18:00", "18:30"), event("running", "17:00", "17:30")], NOW);
        expect(next?.id).toBe("running");
    });

    it("skips finished, all-day and long events", () => {
        const next = nextMeeting(
            [
                event("done", "16:00", "17:00"),
                event("offsite", "00:00", "00:00+1", { allDay: true }),
                event("hackathon", "17:00", "21:00"),
                event("a", "18:00", "18:30"),
            ],
            NOW,
        );
        expect(next?.id).toBe("a");
    });

    it("finds nothing when the agenda is empty", () => {
        expect(nextMeeting([], NOW)).toBeUndefined();
    });
});

describe("meetingsInProgress", () => {
    it("lists every meeting running now, but neither long nor finished nor upcoming ones", () => {
        const running = meetingsInProgress(
            [
                event("b", "17:00", "17:30"),
                event("a", "16:45", "17:15"),
                event("done", "16:00", "17:00"),
                event("later", "17:30", "18:00"),
                event("hackathon", "16:00", "21:00"),
            ],
            NOW,
        );
        expect(ids(running)).toEqual(["a", "b"]);
    });
});

describe("overlapsWith", () => {
    it("lists the meetings happening at the same time, but not long or touching ones", () => {
        const meeting = event("a", "18:00", "18:30");
        const others = overlapsWith(meeting, [
            meeting,
            event("c", "18:15", "19:15"),
            event("b", "17:30", "18:05"),
            event("touching", "18:30", "19:00"),
            event("hackathon", "17:45", "21:45"),
        ]);
        expect(ids(others)).toEqual(["b", "c"]);
    });
});
