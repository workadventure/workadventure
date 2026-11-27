import type { CalendarEventInterface, CalendarSourceInterface } from "@workadventure/shared-utils";
import { get } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";

const { setCalendarSelection } = vi.hoisted(() => ({ setCalendarSelection: vi.fn() }));
// The real LocalUserStore pulls half the app in; the store only needs these two calls.
vi.mock("../../../src/front/Connection/LocalUserStore", () => ({
    localUserStore: { getCalendarSelection: () => ({}), setCalendarSelection },
}));

import {
    calendarSelectionStore,
    calendarSourcesStore,
    isCalendarShown,
    setCalendarChoice,
    visibleEvents,
} from "../../../src/front/Stores/CalendarStore";

const START = new Date("2026-11-27T14:00:00Z");

function source(id: string, extra: Partial<CalendarSourceInterface> = {}): CalendarSourceInterface {
    return { id, name: id, selectedByDefault: true, ...extra };
}

function meeting(calendarId: string | undefined, eventId: string, extra: Partial<CalendarEventInterface> = {}) {
    const event: CalendarEventInterface = {
        id: calendarId ? `${calendarId}:${eventId}` : eventId,
        title: eventId,
        description: "",
        start: START,
        end: new Date(START.getTime() + 30 * 60_000),
        ...extra,
    };
    if (calendarId) event.calendar = { id: calendarId, name: calendarId };
    return event;
}

const toMap = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]));
const ids = (events: Map<string, CalendarEventInterface>) => [...events.keys()].sort();

describe("isCalendarShown", () => {
    it("follows the user's choice, then the calendar's default, then shows an unknown calendar", () => {
        expect(isCalendarShown("a", source("a", { selectedByDefault: true }), { a: false })).toBe(false);
        expect(isCalendarShown("a", source("a", { selectedByDefault: false }), {})).toBe(false);
        expect(isCalendarShown("a", undefined, {})).toBe(true);
    });
});

describe("visibleEvents", () => {
    it("keeps a meeting without calendar and drops those of an unticked calendar", () => {
        const events = toMap([meeting(undefined, "legacy"), meeting("google:a", "1"), meeting("google:b", "2")]);
        const visible = visibleEvents(events, toMap([source("google:a"), source("google:b")]), { "google:b": false });
        expect(ids(visible)).toEqual(["google:a:1", "legacy"]);
    });

    it("keeps the copy of a ticked calendar when the other copy's calendar is unticked", () => {
        const events = toMap([meeting("google:a", "x", { uid: "u" }), meeting("google:b", "y", { uid: "u" })]);
        const visible = visibleEvents(events, toMap([source("google:a"), source("google:b")]), { "google:a": false });
        expect(ids(visible)).toEqual(["google:b:y"]);
    });

    it("shows a meeting found in two chosen calendars once, the main calendar's copy", () => {
        const events = toMap([meeting("google:team", "x", { uid: "u" }), meeting("google:me", "y", { uid: "u" })]);
        const sources = toMap([source("google:team"), source("google:me", { primary: true })]);
        expect(ids(visibleEvents(events, sources, {}))).toEqual(["google:me:y"]);
    });

    it("keeps the occurrences of a series: same uid, different starts", () => {
        const events = toMap([
            meeting("google:a", "1", { uid: "u" }),
            meeting("google:a", "2", { uid: "u", start: new Date(START.getTime() + 86_400_000) }),
        ]);
        expect(visibleEvents(events, toMap([source("google:a")]), {}).size).toBe(2);
    });
});

describe("setCalendarChoice", () => {
    afterEach(() => {
        calendarSourcesStore.set(new Map());
        calendarSelectionStore.set({});
        setCalendarSelection.mockClear();
    });

    it("stores only the choices that differ from the default", () => {
        calendarSourcesStore.set(toMap([source("google:leo", { selectedByDefault: false })]));

        setCalendarChoice("google:leo", true);
        expect(get(calendarSelectionStore)).toEqual({ "google:leo": true });
        expect(setCalendarSelection).toHaveBeenLastCalledWith({ "google:leo": true });

        setCalendarChoice("google:leo", false);
        expect(get(calendarSelectionStore)).toEqual({});
        expect(setCalendarSelection).toHaveBeenLastCalledWith({});
    });
});
