import { writable } from "svelte/store";


export const lightMode = writable(true);
export const rightMode = writable(false);
export const focusMode = writable(false);
export const hideMode = writable(false);
export const highlightFullScreen = writable(false);
export const setHeight = writable(0);
