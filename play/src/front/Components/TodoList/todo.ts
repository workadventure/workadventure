import type { TodoListInterface, TodoTaskInterface } from "@workadventure/shared-utils";
import { formatDayName, startOfDay } from "../Calendar/agenda";

export type DueGroup = "overdue" | "today" | "tomorrow" | "nextSevenDays" | "later" | "noDueDate";

export interface TodoItem {
    task: TodoTaskInterface;
    list: TodoListInterface;
    /** The list's position among all of them, whatever the filter: it picks the list's color. */
    listIndex: number;
}

export interface TodoSection {
    group: DueGroup;
    items: TodoItem[];
}

export interface Todo {
    /** Overdue and due today: what the "for today" card shows. */
    focus: TodoItem[];
    /** Everything else still to do, by when it is due. Empty sections are left out. */
    sections: TodoSection[];
    /** Most recently completed first. */
    done: TodoItem[];
}

const GROUPS: DueGroup[] = ["overdue", "today", "tomorrow", "nextSevenDays", "later", "noDueDate"];

// The agenda's colors, red aside: it means overdue here. Literal class names, for Tailwind to find them.
const LIST_COLORS = ["bg-secondary-300", "bg-success-400", "bg-warning-400", "bg-contrast-200"];

export const listColor = (listIndex: number) => LIST_COLORS[listIndex % LIST_COLORS.length];

/** Whole days from today to that day: negative once it has passed. */
export function daysUntil(date: Date, now: Date): number {
    // Rounded: a day is 23 or 25 hours long when the clocks change.
    return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000));
}

export function dueGroup(task: TodoTaskInterface, now: Date): DueGroup {
    // The providers put the due date in `start`.
    if (!task.start) return "noDueDate";
    const days = daysUntil(task.start, now);
    if (days < 0) return "overdue";
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return days <= 7 ? "nextSevenDays" : "later";
}

/** The earliest due first, in progress before not started on the same date; undated last, in the provider's order. */
function byDue(a: TodoItem, b: TodoItem): number {
    const due = (item: TodoItem) => item.task.start?.getTime() ?? Infinity;
    const started = (item: TodoItem) => (item.task.status === "inProgress" ? 0 : 1);
    // Infinity - Infinity is NaN, falsy: two undated tasks fall through to the next criterion.
    return due(a) - due(b) || started(a) - started(b);
}

/**
 * Lays the tasks of every list out by when they are due, whatever order the providers filled them in.
 * With `listId`, only that list's tasks.
 */
export function buildTodo(lists: Iterable<TodoListInterface>, now: Date, listId?: string): Todo {
    const toDo: TodoItem[] = [];
    const done: TodoItem[] = [];
    [...lists].forEach((list, listIndex) => {
        if (listId !== undefined && list.id !== listId) return;
        for (const task of list.tasks) {
            (task.status === "completed" ? done : toDo).push({ task, list, listIndex });
        }
    });
    toDo.sort(byDue);
    done.sort((a, b) => (b.task.end?.getTime() ?? 0) - (a.task.end?.getTime() ?? 0));

    const [overdue, today, ...later] = GROUPS.map((group) => ({
        group,
        items: toDo.filter((item) => dueGroup(item.task, now) === group),
    }));
    return {
        focus: [...overdue.items, ...today.items],
        sections: later.filter((section) => section.items.length > 0),
        done,
    };
}

/** "Yesterday", "Today", "Tomorrow" up close, "Fri 16" within the week, "20 Nov" further away. */
export function formatDue(date: Date, now: Date): string {
    const days = daysUntil(date, now);
    if (days <= 1) return formatDayName(startOfDay(date), now);
    if (days <= 7) return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
