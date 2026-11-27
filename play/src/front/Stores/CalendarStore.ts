import type { CalendarEventInterface, CalendarSourceInterface } from "@workadventure/shared-utils";
import { derived, get, writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";

export const isActivatedStore = writable(false);
export const isCalendarVisibleStore = writable(false);
/** Every meeting the calendar module read, from every calendar of the account. */
export const calendarEventsStore = writable(new Map<string, CalendarEventInterface>());
/** The calendars of the account, published by the calendar module. Empty for a module that does not publish them. */
export const calendarSourcesStore = writable(new Map<string, CalendarSourceInterface>());
/** The user's choices that differ from each calendar's default, by calendar id. */
export const calendarSelectionStore = writable<Record<string, boolean>>(localUserStore.getCalendarSelection());

/**
 * Whether the meetings of a calendar go in the agenda: the user's choice if any, else the calendar's
 * default, else (calendar not published yet) yes.
 */
export function isCalendarShown(
    calendarId: string,
    source: CalendarSourceInterface | undefined,
    selection: Record<string, boolean>,
): boolean {
    return selection[calendarId] ?? source?.selectedByDefault ?? true;
}

/**
 * Ticks or unticks a calendar. A choice equal to the calendar's default is not stored, so a calendar
 * follows its default again once the user goes back to it.
 */
export function setCalendarChoice(calendarId: string, shown: boolean): void {
    const defaultShown = get(calendarSourcesStore).get(calendarId)?.selectedByDefault ?? true;
    const next = { ...get(calendarSelectionStore) };
    if (shown === defaultShown) {
        delete next[calendarId];
    } else {
        next[calendarId] = shown;
    }
    calendarSelectionStore.set(next);
    localUserStore.setCalendarSelection(next);
}

/**
 * The meetings the agenda shows: those of the chosen calendars, then without duplicates. A meeting found in
 * several chosen calendars (same uid, same start) is kept once, preferably the copy of the main calendar.
 * Filtering comes first, so unticking the calendar of one copy keeps the meeting if another chosen calendar
 * holds it.
 */
export function visibleEvents(
    events: Map<string, CalendarEventInterface>,
    sources: Map<string, CalendarSourceInterface>,
    selection: Record<string, boolean>,
): Map<string, CalendarEventInterface> {
    const kept = new Map<string, CalendarEventInterface>();
    const byUid = new Map<string, CalendarEventInterface>();
    for (const event of events.values()) {
        const calendarId = event.calendar?.id;
        if (calendarId !== undefined && !isCalendarShown(calendarId, sources.get(calendarId), selection)) {
            continue;
        }
        if (event.uid === undefined) {
            kept.set(event.id, event);
            continue;
        }
        const key = `${event.uid}|${event.start.getTime()}`;
        const other = byUid.get(key);
        if (other === undefined) {
            byUid.set(key, event);
            kept.set(event.id, event);
            continue;
        }
        const otherIsPrimary = other.calendar !== undefined && sources.get(other.calendar.id)?.primary === true;
        const isPrimary = calendarId !== undefined && sources.get(calendarId)?.primary === true;
        if (isPrimary && !otherIsPrimary) {
            kept.delete(other.id);
            byUid.set(key, event);
            kept.set(event.id, event);
        }
    }
    return kept;
}

export const visibleCalendarEventsStore = derived(
    [calendarEventsStore, calendarSourcesStore, calendarSelectionStore],
    ([$events, $sources, $selection]) => visibleEvents($events, $sources, $selection),
);

/** The calendars whose meetings are in the agenda. */
export const shownCalendarsStore = derived([calendarSourcesStore, calendarSelectionStore], ([$sources, $selection]) =>
    [...$sources.values()].filter((source) => isCalendarShown(source.id, source, $selection)),
);

/** The chosen calendars whose last read failed. */
export const staleCalendarsStore = derived(shownCalendarsStore, ($shown) =>
    $shown.filter((source) => source.stale === true),
);
