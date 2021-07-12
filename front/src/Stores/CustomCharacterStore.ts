import { derived, writable, Writable } from "svelte/store";

export const customCharacterSceneVisibleStore = writable(false);

export const activeRowStore = writable(0);
