import type { CalendarEventInterface } from "@workadventure/shared-utils";
import { derived, writable } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";

export const isActivatedStore = writable(false);
export const isCalendarVisibleStore = writable(false);
export const calendarEventsStore = writable(new Map<string, CalendarEventInterface>());

// Both stores, because the panel is rendered under both: visible alone would start
// measuring a panel the user cannot see on a world where the module is off.
// This is a singleton so we can safely not ever unsubscribe from it.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
derived([isActivatedStore, isCalendarVisibleStore], ([$isActivatedStore, $isCalendarVisibleStore]) => {
    return $isActivatedStore && $isCalendarVisibleStore;
}).subscribe((visible) => {
    analyticsClient.externalModulePanelVisibilityChanged("calendar", visible);
});
