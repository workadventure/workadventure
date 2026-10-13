import type { CalendarEventInterface } from "@workadventure/shared-utils";

/**
 * An event at least this long (a hackathon, an afternoon workshop) runs alongside the meetings rather than
 * competing with them: it is shown apart, and never counted as "the next meeting".
 */
export const LONG_EVENT_MS = 3 * 60 * 60 * 1000;

export type AgendaItem =
    | { kind: "event"; start: Date; event: CalendarEventInterface }
    | { kind: "long"; start: Date; event: CalendarEventInterface }
    /** Two or more meetings, each overlapping at least one other of the run. */
    | { kind: "overlap"; start: Date; end: Date; events: CalendarEventInterface[] };

export interface AgendaDay {
    /** Local midnight. */
    date: Date;
    allDay: CalendarEventInterface[];
    items: AgendaItem[];
    /** Every event of the day, all-day ones included. */
    count: number;
}

const byStart = (a: CalendarEventInterface, b: CalendarEventInterface) =>
    a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime();

const isLong = (event: CalendarEventInterface) => event.end.getTime() - event.start.getTime() >= LONG_EVENT_MS;

export function startOfDay(date: Date): Date {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
}

/**
 * Lays the events out day by day, in chronological order whatever order the provider filled them in.
 * Within a day, all-day and long events are set apart, and meetings that overlap are grouped into runs.
 * An event that started before today and is still running belongs to today. Finished events are dropped:
 * there is nothing left to do with them, and the providers stop sending them at their next refresh anyway.
 */
export function buildAgenda(events: Iterable<CalendarEventInterface>, now: Date): AgendaDay[] {
    const today = startOfDay(now).getTime();
    // Sorted input, so the days are inserted in chronological order.
    const eventsByDay = new Map<number, CalendarEventInterface[]>();
    for (const event of [...events].sort(byStart)) {
        if (event.end <= now) continue;
        const day = Math.max(startOfDay(event.start).getTime(), today);
        const dayEvents = eventsByDay.get(day);
        if (dayEvents) dayEvents.push(event);
        else eventsByDay.set(day, [event]);
    }

    return [...eventsByDay].map(([day, dayEvents]) => {
        const items: AgendaItem[] = [];
        let run: Extract<AgendaItem, { kind: "overlap" }> | undefined;
        for (const event of dayEvents) {
            if (event.allDay) continue;
            if (isLong(event)) {
                items.push({ kind: "long", start: event.start, event });
                continue;
            }
            if (run && event.start < run.end) {
                run.events.push(event);
                if (event.end > run.end) run.end = event.end;
                continue;
            }
            run = { kind: "overlap", start: event.start, end: event.end, events: [event] };
            items.push(run);
        }
        return {
            date: new Date(day),
            allDay: dayEvents.filter((event) => event.allDay),
            // A run of one meeting is just a meeting.
            items: items.map((item) =>
                item.kind === "overlap" && item.events.length === 1
                    ? { kind: "event", start: item.start, event: item.events[0] }
                    : item,
            ),
            count: dayEvents.length,
        };
    });
}

/** The meeting in progress, else the next one to start. All-day and long events would hold the spot all day. */
export function nextMeeting(events: Iterable<CalendarEventInterface>, now: Date): CalendarEventInterface | undefined {
    return [...events].filter((event) => !event.allDay && !isLong(event) && event.end > now).sort(byStart)[0];
}

/** The meetings running right now, long and all-day events aside. */
export function meetingsInProgress(events: Iterable<CalendarEventInterface>, now: Date): CalendarEventInterface[] {
    return [...events]
        .filter((event) => !event.allDay && !isLong(event) && event.start <= now && now < event.end)
        .sort(byStart);
}

/** The other meetings happening during this one. */
export function overlapsWith(
    meeting: CalendarEventInterface,
    events: Iterable<CalendarEventInterface>,
): CalendarEventInterface[] {
    return [...events]
        .filter(
            (event) =>
                event.id !== meeting.id &&
                !event.allDay &&
                !isLong(event) &&
                event.start < meeting.end &&
                meeting.start < event.end,
        )
        .sort(byStart);
}

// undefined locale everywhere: follow the browser's own date/time settings.

export function formatTime(date: Date): string {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** "Today", "Tomorrow", then the weekday. */
export function formatDayName(day: Date, now: Date): string {
    // Rounded: a day is 23 or 25 hours long when the clocks change.
    const daysAway = Math.round((day.getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000));
    const name =
        daysAway <= 1
            ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(daysAway, "day")
            : day.toLocaleDateString(undefined, { weekday: "long" });
    return name.charAt(0).toLocaleUpperCase() + name.slice(1);
}

/** "in 5 minutes", "in 2 hours"… */
export function formatTimeUntil(date: Date, now: Date): string {
    const minutes = Math.max(1, Math.round((date.getTime() - now.getTime()) / 60_000));
    const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    if (minutes < 60) return format.format(minutes, "minute");
    if (minutes < 24 * 60) return format.format(Math.round(minutes / 60), "hour");
    return format.format(Math.round(minutes / (24 * 60)), "day");
}

/** "30 min", "1 h 15". */
export function formatDuration(event: CalendarEventInterface): string {
    const minutes = Math.round((event.end.getTime() - event.start.getTime()) / 60_000);
    if (minutes < 60) return `${minutes} min`;
    const rest = minutes % 60;
    return `${Math.floor(minutes / 60)} h${rest ? ` ${String(rest).padStart(2, "0")}` : ""}`;
}
