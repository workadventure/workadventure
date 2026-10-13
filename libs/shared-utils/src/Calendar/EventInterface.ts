export interface CalendarEventInterface {
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
