export interface CalendarEventInterface {
    /**
     * Unique key of the meeting, also its key in the calendar events Map.
     * Modules that read several calendars build it as `<calendar id>:<provider event id>`, so two copies
     * of the same meeting in two calendars have two different ids.
     */
    id: string;
    title: string;
    description: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: {
        body?: {
            content?: string;
            contentType?: string;
        };
        onlineMeeting?: {
            joinUrl?: string;
            passcode?: string;
            /**
             * True when the conference of this event is a WorkAdventure meeting (booked through the
             * WorkAdventure add-on of the calendar provider). Such a meeting happens inside
             * WorkAdventure: joining it is a navigation, not an external link.
             */
            isWorkAdventure?: boolean;
        };
    };
    /**
     * The calendar holding this meeting. A meeting without it is always shown (module that reads one
     * calendar only).
     */
    calendar?: { id: string; name: string };
    /**
     * iCalendar UID, shared by the copies of one meeting in several calendars. Meetings with the same uid
     * and the same start are shown once. A meeting without it is never deduplicated.
     */
    uid?: string;
}

/**
 * One calendar of the user's account, as published by the calendar module.
 */
export interface CalendarSourceInterface {
    /** Prefixed by the provider: `google:<calendarId>`, `ms:<calendarId>`. */
    id: string;
    name: string;
    /** The main calendar of the account (Google `primary`, Graph `isDefaultCalendar`). */
    primary?: boolean;
    /** Shown in the agenda unless the user changed it: main calendar and calendars the user can edit. */
    selectedByDefault: boolean;
    /** The last read of this calendar failed: its meetings are those of the previous read. */
    stale?: true;
}

/**
 * How far ahead the agenda looks: a week, so the user can see the days ahead and not only the next meeting.
 * A panel that stopped at midnight was empty every evening, and hid the 9am meeting the user needed to see
 * before logging off.
 */
export const CALENDAR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The time window the agenda displays: from now to CALENDAR_WINDOW_MS later.
 *
 * Both bounds move with the clock, so an ongoing meeting stays visible (calendar APIs filter on the
 * event end time) while a finished one drops out on the next refresh.
 */
export function calendarWindow(now: Date = new Date()): { from: Date; to: Date } {
    return { from: now, to: new Date(now.getTime() + CALENDAR_WINDOW_MS) };
}
