import { derived, writable } from "svelte/store";
import type { TodoListInterface } from "@workadventure/shared-utils";
import { analyticsClient } from "../Administration/AnalyticsClient";

export const isActivatedStore = writable(false);
export const isTodoListVisibleStore = writable(false);
export const todoListsStore = writable(new Map<string, TodoListInterface>());

// See CalendarStore for why this reads both stores.
// This is a singleton so we can safely not ever unsubscribe from it.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
derived([isActivatedStore, isTodoListVisibleStore], ([$isActivatedStore, $isTodoListVisibleStore]) => {
    return $isActivatedStore && $isTodoListVisibleStore;
}).subscribe((visible) => {
    analyticsClient.externalModulePanelVisibilityChanged("todo_list", visible);
});
