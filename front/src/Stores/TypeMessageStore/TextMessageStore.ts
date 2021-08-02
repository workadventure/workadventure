import { writable } from "svelte/store";

export const textMessageVisibleStore = writable(false);

export const textMessageContentStore = writable("");
