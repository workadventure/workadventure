import { writable } from "svelte/store";

export const editorModeStore = writable(false);

export const editorModeDragCameraPointerDownStore = writable(false);
