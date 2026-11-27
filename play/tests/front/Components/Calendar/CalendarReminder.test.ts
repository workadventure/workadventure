import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { get } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";

// The real LocalUserStore pulls half the app in; the calendar store only needs these two calls.
vi.mock("../../../../src/front/Connection/LocalUserStore", () => ({
    localUserStore: { getCalendarSelection: () => ({}), setCalendarSelection: () => {} },
}));

import {
    calendarEventsStore,
    calendarSelectionStore,
    calendarSourcesStore,
} from "../../../../src/front/Stores/CalendarStore";
import {
    calendarRemindersStore,
    startCalendarReminders,
    dueReminders,
    REMINDER_LEAD_MS,
    REMINDER_LINGER_MS,
} from "../../../../src/front/Components/Calendar/CalendarReminder";

const NOW = new Date("2026-09-10T10:00:00.000Z");
const MINUTE = 60 * 1000;

function event(id: string, startsInMs: number, extra: Partial<CalendarEventInterface> = {}): CalendarEventInterface {
    return {
        id,
        title: `Meeting ${id}`,
        description: "",
        start: new Date(NOW.getTime() + startsInMs),
        end: new Date(NOW.getTime() + startsInMs + 30 * MINUTE),
        ...extra,
    };
}

const ids = (events: CalendarEventInterface[]) => events.map((e) => e.id);

describe("dueReminders", () => {
    it("reminds of a meeting from 5 minutes before it starts", () => {
        const due = dueReminders(
            [event("soon", REMINDER_LEAD_MS), event("later", REMINDER_LEAD_MS + MINUTE)],
            new Set(),
            NOW,
        );
        expect(ids(due)).toEqual(["soon"]);
    });

    it("keeps reminding until 10 minutes after the start, for whoever arrives late", () => {
        const due = dueReminders(
            [event("late", -REMINDER_LINGER_MS + MINUTE), event("too-late", -REMINDER_LINGER_MS)],
            new Set(),
            NOW,
        );
        expect(ids(due)).toEqual(["late"]);
    });

    it("stops once the meeting is over, even within those 10 minutes", () => {
        const short = event("short", -8 * MINUTE, { end: new Date(NOW.getTime() - 3 * MINUTE) });
        expect(dueReminders([short], new Set(), NOW)).toEqual([]);
    });

    it("never reminds of a dismissed meeting, an all-day event or a long one", () => {
        const due = dueReminders(
            [
                event("dismissed", MINUTE),
                event("all-day", MINUTE, { allDay: true }),
                event("hackathon", MINUTE, { end: new Date(NOW.getTime() + 4 * 60 * MINUTE) }),
            ],
            new Set(["dismissed"]),
            NOW,
        );
        expect(due).toEqual([]);
    });

    it("shows three reminders at most, the earliest first", () => {
        const due = dueReminders(
            [event("d", 4 * MINUTE), event("b", 2 * MINUTE), event("a", MINUTE), event("c", 3 * MINUTE)],
            new Set(),
            NOW,
        );
        expect(ids(due)).toEqual(["a", "b", "c"]);
    });
});

describe("startCalendarReminders", () => {
    afterEach(() => {
        calendarEventsStore.set(new Map());
        calendarSourcesStore.set(new Map());
        calendarSelectionStore.set({});
        calendarRemindersStore.set([]);
        vi.useRealTimers();
    });

    it("does not remind of a meeting from an unticked calendar", () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        calendarSourcesStore.set(new Map([["google:leo", { id: "google:leo", name: "Léo", selectedByDefault: true }]]));
        calendarSelectionStore.set({ "google:leo": false });
        calendarEventsStore.set(
            new Map([
                ["google:leo:1", event("google:leo:1", 3 * MINUTE, { calendar: { id: "google:leo", name: "Léo" } })],
            ]),
        );

        const stop = startCalendarReminders();
        expect(get(calendarRemindersStore)).toEqual([]);

        // Ticked again: the same meeting is due.
        calendarSelectionStore.set({});
        expect(ids(get(calendarRemindersStore))).toEqual(["google:leo:1"]);
        stop();
    });
});
