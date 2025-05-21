import { writable } from "svelte/store";

// TODO : Do only one stor for all the mode to avoid bug

export const lightMode = writable(true);
export const rightMode = writable(false);
export const focusMode = writable(false);
export const hideMode = writable(false);
export const highlightFullScreen = writable(false);
