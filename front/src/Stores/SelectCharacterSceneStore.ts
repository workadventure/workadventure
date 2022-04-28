import { writable } from "svelte/store";

export const customizeAvailableStore = writable(false);

export const selectedCollection = writable<string>();
