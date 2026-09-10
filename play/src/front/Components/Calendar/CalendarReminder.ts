import { get } from "svelte/store";
import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { calendarEventsStore, isCalendarVisibleStore } from "../../Stores/CalendarStore";
import { isTodoListVisibleStore } from "../../Stores/TodoListStore";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import LL from "../../../i18n/i18n-svelte";

/** How long before it starts a meeting is announced. */
export const REMINDER_LEAD_MS = 2 * 60 * 1000;

const CHECK_INTERVAL_MS = 30 * 1000;

/**
 * Which meetings have already been announced. Module scope on purpose: MainLayout, the only caller of
 * startCalendarReminders(), is destroyed and remounted on every room-to-room transition, and a set
 * living inside the call would announce the same meeting again at every door the user walks through.
 */
const alreadyNotified = new Set<string>();

/**
 * The events that are about to start and have not been announced yet.
 *
 * An event that already started is not "about to start": we would be shouting about a meeting the
 * user is either already in, or has knowingly skipped. A tab suspended across the whole lead window
 * therefore misses its reminder, which is the right trade-off.
 */
export function dueReminders(
    events: Iterable<CalendarEventInterface>,
    alreadyNotified: ReadonlySet<string>,
    now: Date
): CalendarEventInterface[] {
    return [...events].filter((event) => {
        if (event.allDay === true || alreadyNotified.has(event.id)) {
            return false;
        }
        const msUntilStart = event.start.getTime() - now.getTime();
        return msUntilStart > 0 && msUntilStart <= REMINDER_LEAD_MS;
    });
}

/**
 * Announce meetings shortly before they start, whatever the calendar provider that filled the store.
 * Returns the function stopping the reminders.
 */
export function startCalendarReminders(): () => void {
    const check = () => {
        const due = dueReminders(get(calendarEventsStore).values(), alreadyNotified, new Date());
        if (due.length === 0) {
            return;
        }
        for (const event of due) {
            alreadyNotified.add(event.id);
            notificationPlayingStore.playNotification(
                get(LL).externalModule.calendar.meetingStartingSoon({ title: event.title }),
                undefined,
                `calendar-reminder-${event.id}`
            );
        }
        // The agenda holds the join link: put it in front of the user rather than let him hunt for it.
        // The to-do list shares the agenda's corner of the screen, so opening one closes the other,
        // as every other opener of these panels does.
        isCalendarVisibleStore.set(true);
        isTodoListVisibleStore.set(false);
    };

    const interval = setInterval(check, CHECK_INTERVAL_MS);
    // A refresh can bring in a meeting that is already inside the lead window.
    const unsubscribe = calendarEventsStore.subscribe(check);

    return () => {
        clearInterval(interval);
        unsubscribe();
    };
}
