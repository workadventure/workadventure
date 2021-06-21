import { writable } from "svelte/store";

export const ConsoleGlobalMessageManagerVisibleStore = writable(false);

export const ConsoleGlobalMessageManagerFocusStore = writable(false);