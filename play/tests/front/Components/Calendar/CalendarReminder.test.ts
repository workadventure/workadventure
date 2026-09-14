import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { describe, expect, it } from "vitest";

import { dueReminders, REMINDER_LEAD_MS } from "../../../../src/front/Components/Calendar/CalendarReminder";

const NOW = new Date("2026-09-10T10:00:00.000Z");

function event(id: string, startsInMs: number, allDay = false): CalendarEventInterface {
    return {
        id,
        title: `Meeting ${id}`,
        description: "",
        start: new Date(NOW.getTime() + startsInMs),
        end: new Date(NOW.getTime() + startsInMs + 30 * 60 * 1000),
        allDay,
    };
}

describe("dueReminders", () => {
    it("announces a meeting inside the lead window", () => {
        const due = dueReminders([event("soon", REMINDER_LEAD_MS - 1000)], new Set(), NOW);
        expect(due.map((e) => e.id)).toEqual(["soon"]);
    });

    it("stays quiet for a meeting further away than the lead window", () => {
        const due = dueReminders([event("later", REMINDER_LEAD_MS + 1000)], new Set(), NOW);
        expect(due).toEqual([]);
    });

    it("stays quiet once the meeting has started", () => {
        const due = dueReminders([event("started", -1000), event("starting-now", 0)], new Set(), NOW);
        expect(due).toEqual([]);
    });

    it("announces a meeting only once", () => {
        const due = dueReminders([event("soon", 60_000)], new Set(["soon"]), NOW);
        expect(due).toEqual([]);
    });

    it("ignores all-day events, which have no start time to announce", () => {
        const due = dueReminders([event("all-day", 60_000, true)], new Set(), NOW);
        expect(due).toEqual([]);
    });
});
