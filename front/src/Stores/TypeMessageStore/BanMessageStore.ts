import { writable } from "svelte/store";

export const banMessageVisibleStore = writable(false);

export const banMessageContentStore = writable("");
