import type { CalendarEventInterface, TodoListInterface } from "@workadventure/shared-utils";
import { formatTime, formatTimeUntil, meetingPlace, startOfDay } from "../../Components/Calendar/agenda";
import { buildTodo, dueGroup, formatDue } from "../../Components/TodoList/todo";
import type {
    CompanionAgenda,
    CompanionAgendaMeeting,
    CompanionAgendaTask,
} from "../../Interfaces/DesktopAppInterfaces";

const SHOWN = 3;
// A meeting starting within the hour gets the strip under the companion's header.
const SOON_MS = 60 * 60 * 1000;

export interface CompanionAgendaInput {
    /** undefined: no calendar connected in this world. */
    events?: Iterable<CalendarEventInterface>;
    /** undefined: no task list connected in this world. */
    lists?: Iterable<TodoListInterface>;
    now: Date;
    labels: { inProgress: string; until: (time: string) => string };
}

/**
 * What the desktop companion shows of the agenda and the tasks: the day's next meetings and the most
 * urgent tasks, formatted for display. Undefined when the world has neither.
 */
export function buildCompanionAgenda(input: CompanionAgendaInput): CompanionAgenda | undefined {
    if (!input.events && !input.lists) return undefined;
    const { now, labels } = input;
    const agenda: CompanionAgenda = {};

    if (input.events) {
        const today = startOfDay(now).getTime();
        const upcoming = [...input.events]
            .filter((event) => !event.allDay && event.end > now && startOfDay(event.start).getTime() === today)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, SHOWN);
        // Join is offered on the meeting in progress and on the next one to start.
        const nextIndex = upcoming[0] && upcoming[0].start <= now ? 1 : 0;
        agenda.meetings = upcoming.map((event, index): CompanionAgendaMeeting => {
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
            items: open.slice(0, SHOWN).map(({ task, list }): CompanionAgendaTask => {
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
