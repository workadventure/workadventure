import { writable } from "svelte/store";

export const emoteStore = writable<string | null>(null);
export const emoteMenuStore = writable(false);
