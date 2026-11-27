import type { CalendarEventInterface, CalendarSourceInterface } from "./EventInterface";

/** The result of reading one calendar. `events` is absent when the read failed. */
export interface CalendarReadResult {
    source: CalendarSourceInterface;
    events?: CalendarEventInterface[];
}

export interface CalendarState {
    sources: Map<string, CalendarSourceInterface>;
    events: Map<string, CalendarEventInterface>;
}

function markStale(source: CalendarSourceInterface): CalendarSourceInterface {
    return { ...source, stale: true };
}

function withoutStale(source: CalendarSourceInterface): CalendarSourceInterface {
    const copy = { ...source };
    delete copy.stale;
    return copy;
}

/**
 * Builds the new calendars state from one read of every calendar, so that a calendar that could not be read
 * is never lost silently: it keeps the meetings of the previous read and is marked stale.
 *
 * - `results` undefined (the calendar list itself failed): everything from `previous` is kept, marked stale.
 * - A calendar read: its meetings replace the previous ones.
 * - A calendar whose read failed: its previous meetings are kept, the source is marked stale.
 * - A calendar absent from `results` (removed from the account, or no longer readable) disappears with its
 *   meetings.
 */
export function mergeCalendarRead(results: CalendarReadResult[] | undefined, previous: CalendarState): CalendarState {
    if (results === undefined) {
        return {
            sources: new Map([...previous.sources].map(([id, source]) => [id, markStale(source)])),
            events: new Map(previous.events),
        };
    }

    const sources = new Map<string, CalendarSourceInterface>();
    const events = new Map<string, CalendarEventInterface>();
    for (const result of results) {
        const id = result.source.id;
        if (result.events !== undefined) {
            sources.set(id, withoutStale(result.source));
            for (const event of result.events) {
                events.set(event.id, event);
            }
        } else {
            sources.set(id, markStale(result.source));
            for (const event of previous.events.values()) {
                if (event.calendar?.id === id) {
                    events.set(event.id, event);
                }
            }
        }
    }
    return { sources, events };
}
