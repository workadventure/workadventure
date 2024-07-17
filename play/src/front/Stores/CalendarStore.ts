import { CalendarEventInterface } from "@workadventure/shared-utils";
import { writable } from "svelte/store";

export const isActivatedStore = writable(false);
export const isCalendarVisibleStore = writable(false);
export const calendarEventsStore = writable(new Map<string, CalendarEventInterface>());
