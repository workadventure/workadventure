import type { TodoListInterface, TodoTaskInterface } from "@workadventure/shared-utils";
import { describe, expect, it } from "vitest";

import { buildTodo, dueGroup, formatDue } from "../../../../src/front/Components/TodoList/todo";

// Local times on purpose: due dates are local days. Tuesday 13 October 2026, mid-afternoon.
const NOW = new Date(2026, 9, 13, 15, 4);
const day = (date: number) => new Date(2026, 9, date);

function task(id: string, due?: number, extra: Partial<TodoTaskInterface> = {}): TodoTaskInterface {
    return { id, title: id, description: "", status: "notStarted", start: due ? day(due) : undefined, ...extra };
}

const list = (id: string, tasks: TodoTaskInterface[]): TodoListInterface => ({ id, title: id, tasks });
const ids = (items: { task: TodoTaskInterface }[]) => items.map((item) => item.task.id);

describe("dueGroup", () => {
    it("files a task by its due day, whatever the time", () => {
        expect(dueGroup(task("a", 12), NOW)).toBe("overdue");
        expect(dueGroup(task("b", 13), NOW)).toBe("today");
        expect(dueGroup(task("c", 14), NOW)).toBe("tomorrow");
        expect(dueGroup(task("d", 20), NOW)).toBe("nextSevenDays");
        expect(dueGroup(task("e", 21), NOW)).toBe("later");
        expect(dueGroup(task("f"), NOW)).toBe("noDueDate");
    });

    it("keeps a task due this morning for today, not overdue", () => {
        expect(dueGroup(task("a", undefined, { start: new Date(2026, 9, 13, 9, 0) }), NOW)).toBe("today");
    });
});

describe("buildTodo", () => {
    const lists = [
        list("mine", [
            task("later", 30),
            task("today", 13),
            task("undated"),
            task("overdue", 12),
            task("done-old", undefined, { status: "completed", end: day(9) }),
            task("done-new", undefined, { status: "completed", end: day(12) }),
        ]),
        list("sprint", [task("tomorrow", 14), task("tomorrow-started", 14, { status: "inProgress" })]),
    ];

    it("puts overdue then today's tasks in the card, across lists", () => {
        expect(ids(buildTodo(lists, NOW).focus)).toEqual(["overdue", "today"]);
    });

    it("sorts the rest by due date whatever the provider's order, in progress first on the same day", () => {
        const { sections } = buildTodo(lists, NOW);
        expect(sections.map((section) => section.group)).toEqual(["tomorrow", "later", "noDueDate"]);
        expect(ids(sections[0].items)).toEqual(["tomorrow-started", "tomorrow"]);
    });

    it("keeps the completed tasks apart, the latest first", () => {
        expect(ids(buildTodo(lists, NOW).done)).toEqual(["done-new", "done-old"]);
    });

    it("filters on one list but keeps each list's color", () => {
        const todo = buildTodo(lists, NOW, "sprint");
        expect(todo.focus).toEqual([]);
        expect(ids(todo.sections[0].items)).toEqual(["tomorrow-started", "tomorrow"]);
        expect(todo.sections[0].items[0].listIndex).toBe(1);
    });
});

describe("formatDue", () => {
    it("names the days around today and dates the others", () => {
        expect(formatDue(day(12), NOW)).toMatch(/^\p{Lu}/u);
        expect(formatDue(day(14), NOW)).not.toBe(formatDue(day(20), NOW));
        expect(formatDue(day(16), NOW)).toBe(
            day(16).toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        );
        expect(formatDue(day(30), NOW)).toBe(day(30).toLocaleDateString(undefined, { day: "numeric", month: "short" }));
    });
});
