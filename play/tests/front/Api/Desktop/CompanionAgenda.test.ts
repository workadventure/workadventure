import type { CalendarEventInterface, TodoListInterface, TodoTaskInterface } from "@workadventure/shared-utils";
import { describe, expect, it } from "vitest";

import { buildCompanionAgenda } from "../../../../src/front/Api/Desktop/CompanionAgenda";

// Local times on purpose: the agenda works in local days. Tuesday 13 October 2026, 10:33.
const NOW = new Date(2026, 9, 13, 10, 33);
const at = (hours: number, minutes = 0, date = 13) => new Date(2026, 9, date, hours, minutes);
const labels = { inProgress: "In progress", until: (time: string) => `until ${time}` };

function event(
    id: string,
    start: Date,
    end: Date,
    extra: Partial<CalendarEventInterface> = {},
): CalendarEventInterface {
    return { id, title: id, description: "", start, end, ...extra };
}
const meet = { resource: { onlineMeeting: { joinUrl: "https://meet.google.com/abc" } } };
const inWa = { resource: { onlineMeeting: { joinUrl: "https://play.example.com/@/t/w/r", isWorkAdventure: true } } };

function task(id: string, due?: Date, extra: Partial<TodoTaskInterface> = {}): TodoTaskInterface {
    return { id, title: id, description: "", status: "notStarted", start: due, ...extra };
}
const list = (id: string, tasks: TodoTaskInterface[]): TodoListInterface => ({ id, title: id, tasks });

describe("buildCompanionAgenda", () => {
    it("is undefined when the world has neither a calendar nor a task list", () => {
        expect(buildCompanionAgenda({ now: NOW, labels })).toBeUndefined();
    });

    it("keeps the day's next three meetings, in progress first, and leaves out the ended, all-day and tomorrow ones", () => {
        const agenda = buildCompanionAgenda({
            now: NOW,
            labels,
            events: [
                event("ended", at(9), at(9, 30)),
                event("allDay", at(0), at(23, 59), { allDay: true }),
                event("demo", at(14), at(15), meet),
                event("daily", at(10), at(10, 45), inWa),
                event("point", at(11), at(11, 30), meet),
                event("late", at(17), at(18)),
                event("tomorrow", at(9, 0, 14), at(10, 0, 14)),
            ],
        });
        expect(agenda?.meetings?.map((m) => m.id)).toEqual(["daily", "point", "demo"]);
        expect(agenda?.tasks).toBeUndefined();
    });

    it("marks what is in progress or starts within the hour, and offers to join only those two", () => {
        const meetings =
            buildCompanionAgenda({
                now: NOW,
                labels,
                events: [
                    event("daily", at(10), at(10, 45), inWa),
                    event("point", at(11), at(11, 30), meet),
                    event("demo", at(14), at(15), meet),
                ],
            })?.meetings ?? [];
        const [daily, point, demo] = meetings;
        expect(daily).toMatchObject({ live: true, soon: true, joinable: true, inApp: true });
        expect(daily.detail).toMatch(/^In progress · until .+ · WorkAdventure$/);
        expect(point).toMatchObject({ live: false, soon: true, joinable: true, inApp: false });
        expect(point.detail).toMatch(/· Google Meet$/);
        expect(demo).toMatchObject({ soon: false, joinable: false });
    });

    it("lists the three most urgent open tasks and counts them all", () => {
        const agenda = buildCompanionAgenda({
            now: NOW,
            labels,
            lists: [
                list("Sprint", [
                    task("later", at(9, 0, 20)),
                    task("done", at(9, 0, 12), { status: "completed" }),
                    task("late", at(9, 0, 12)),
                    task("undated"),
                ]),
                list("Clients", [task("today", at(18), { status: "inProgress" })]),
            ],
        });
        expect(agenda?.meetings).toBeUndefined();
        expect(agenda?.tasks?.open).toBe(4);
        expect(agenda?.tasks?.items.map((t) => [t.id, t.urgency, t.list])).toEqual([
            ["late", "late", "Sprint"],
            ["today", "today", "Clients"],
            ["later", "later", "Sprint"],
        ]);
        expect(agenda?.tasks?.items[1].inProgress).toBe(true);
    });
});
