import { writable } from "svelte/store";

export const loaderVisibleStore = writable(false);
export const loaderProgressStore = writable(0);
