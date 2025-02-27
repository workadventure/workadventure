import { writable } from "svelte/store";

export const customizeAvailableStore = writable(false);
export const collectionsSizeStore = writable<number>(0);

export const selectedCollection = writable<string>();
