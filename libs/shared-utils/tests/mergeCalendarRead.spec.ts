import { describe, expect, it } from "vitest";
import type { CalendarEventInterface, CalendarSourceInterface } from "../src/Calendar/EventInterface";
import { mergeCalendarRead, type CalendarState } from "../src/Calendar/mergeCalendarRead";

function source(id: string, extra: Partial<CalendarSourceInterface> = {}): CalendarSourceInterface {
    return { id, name: id, selectedByDefault: true, ...extra };
}

function meeting(calendarId: string, eventId: string): CalendarEventInterface {
    return {
        id: `${calendarId}:${eventId}`,
        title: eventId,
        description: "",
        start: new Date("2026-11-27T14:00:00Z"),
        end: new Date("2026-11-27T14:30:00Z"),
        calendar: { id: calendarId, name: calendarId },
    };
}

function state(sources: CalendarSourceInterface[], events: CalendarEventInterface[]): CalendarState {
    return {
        sources: new Map(sources.map((s) => [s.id, s])),
        events: new Map(events.map((e) => [e.id, e])),
    };
}

describe("mergeCalendarRead", () => {
    const previous = state(
        [source("google:a"), source("google:b"), source("google:c")],
        [meeting("google:a", "1"), meeting("google:b", "2"), meeting("google:c", "3")],
    );

    it("keeps the previous meetings of a calendar whose read failed, and marks it stale", () => {
        const next = mergeCalendarRead(
            [
                { source: source("google:a"), events: [meeting("google:a", "4")] },
                { source: source("google:b") },
                { source: source("google:c"), events: [] },
            ],
            previous,
        );

        expect([...next.events.keys()].sort()).toEqual(["google:a:4", "google:b:2"]);
        expect(next.sources.get("google:a")?.stale).toBeUndefined();
        expect(next.sources.get("google:b")?.stale).toBe(true);
        expect(next.sources.get("google:c")?.stale).toBeUndefined();
    });

    it("marks a failed calendar that was never read stale, with no meeting", () => {
        const next = mergeCalendarRead([{ source: source("google:new") }], state([], []));

        expect(next.sources.get("google:new")?.stale).toBe(true);
        expect(next.events.size).toBe(0);
    });

    it("keeps everything, marked stale, when the calendar list failed", () => {
        const next = mergeCalendarRead(undefined, previous);

        expect(next.events.size).toBe(3);
        expect([...next.sources.values()].every((s) => s.stale === true)).toBe(true);
    });

    it("drops a calendar absent from the results, with its meetings", () => {
        const next = mergeCalendarRead(
            [
                { source: source("google:a"), events: [meeting("google:a", "1")] },
                { source: source("google:b"), events: [meeting("google:b", "2")] },
            ],
            previous,
        );

        expect(next.sources.has("google:c")).toBe(false);
        expect(next.events.has("google:c:3")).toBe(false);
    });

    it("clears the stale mark once the calendar is read again", () => {
        const stalePrevious = state([source("google:a", { stale: true })], [meeting("google:a", "1")]);
        const next = mergeCalendarRead(
            [{ source: source("google:a", { stale: true }), events: [meeting("google:a", "1")] }],
            stalePrevious,
        );

        expect(next.sources.get("google:a")?.stale).toBeUndefined();
    });
});
