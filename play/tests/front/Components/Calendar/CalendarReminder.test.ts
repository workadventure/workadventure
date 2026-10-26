import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { describe, expect, it } from "vitest";

import {
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
