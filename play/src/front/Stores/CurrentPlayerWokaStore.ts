import { writable } from "svelte/store";

export const currentPlayerWokaStore = writable<string | undefined>(undefined);
