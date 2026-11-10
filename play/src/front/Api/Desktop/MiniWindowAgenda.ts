import type { CalendarEventInterface, TodoListInterface } from "@workadventure/shared-utils";
import { formatTime, formatTimeUntil, meetingPlace, startOfDay } from "../../Components/Calendar/agenda";
import { buildTodo, dueGroup, formatDue } from "../../Components/TodoList/todo";

/** A meeting of the day in the mini window's Today view; texts formatted by the world. */
export type MiniWindowAgendaMeeting = {
    id: string;
    title: string;
    /** Start time, "10:45". */
    time: string;
    /** "in 12 minutes · Google Meet", "In progress · until 10:30 · WorkAdventure". */
    detail: string;
    live: boolean;
    /** In progress or starting within the hour: the strip under the header. */
    soon: boolean;
    joinable: boolean;
    /** Takes place in this WorkAdventure: joining brings the app to the front. */
    inApp: boolean;
};

/** An open task in the mini window's Today view (read-only, like in WorkAdventure). */
export type MiniWindowAgendaTask = {
    id: string;
    title: string;
    /** The task list it belongs to. */
    list: string;
    inProgress: boolean;
    /** "Yesterday", "Today", "Fri 16"; absent without a due date. */
    due?: string;
    urgency: "late" | "today" | "later";
};

/** Each part is absent when the world has no calendar / no task list connected. */
export type MiniWindowAgenda = {
    meetings?: MiniWindowAgendaMeeting[];
    tasks?: { open: number; items: MiniWindowAgendaTask[] };
};

const SHOWN = 3;
// A meeting starting within the hour gets the strip under the mini window's header.
const SOON_MS = 60 * 60 * 1000;

export interface MiniWindowAgendaInput {
    /** undefined: no calendar connected in this world. */
    events?: Iterable<CalendarEventInterface>;
    /** undefined: no task list connected in this world. */
    lists?: Iterable<TodoListInterface>;
    now: Date;
    labels: { inProgress: string; until: (time: string) => string };
}

/**
 * What the desktop mini window shows of the agenda and the tasks: the day's next meetings and the most
 * urgent tasks, formatted for display. Undefined when the world has neither.
 */
export function buildMiniWindowAgenda(input: MiniWindowAgendaInput): MiniWindowAgenda | undefined {
    if (!input.events && !input.lists) return undefined;
    const { now, labels } = input;
    const agenda: MiniWindowAgenda = {};

    if (input.events) {
        const today = startOfDay(now).getTime();
        const upcoming = [...input.events]
            .filter((event) => !event.allDay && event.end > now && startOfDay(event.start).getTime() === today)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, SHOWN);
        // Join is offered on the meeting in progress and on the next one to start.
        const nextIndex = upcoming[0] && upcoming[0].start <= now ? 1 : 0;
        agenda.meetings = upcoming.map((event, index): MiniWindowAgendaMeeting => {
            const live = event.start <= now;
            const place = meetingPlace(event);
            const when = live
                ? `${labels.inProgress} · ${labels.until(formatTime(event.end))}`
                : formatTimeUntil(event.start, now);
            return {
                id: event.id,
                title: event.title,
                time: formatTime(event.start),
                detail: place ? `${when} · ${place}` : when,
                live,
                soon: live || event.start.getTime() - now.getTime() <= SOON_MS,
                joinable: Boolean(event.resource?.onlineMeeting?.joinUrl) && (live || index === nextIndex),
                inApp: Boolean(event.resource?.onlineMeeting?.isWorkAdventure),
            };
        });
    }

    if (input.lists) {
        const todo = buildTodo(input.lists, now);
        const open = [...todo.focus, ...todo.sections.flatMap((section) => section.items)];
        agenda.tasks = {
            open: open.length,
            items: open.slice(0, SHOWN).map(({ task, list }): MiniWindowAgendaTask => {
                const group = dueGroup(task, now);
                return {
                    id: task.id,
                    title: task.title,
                    list: list.title,
                    inProgress: task.status === "inProgress",
                    due: task.start ? formatDue(task.start, now) : undefined,
                    urgency: group === "overdue" ? "late" : group === "today" ? "today" : "later",
                };
            }),
        };
    }
    return agenda;
}
