import { writable } from "svelte/store";

export const searchValue = writable<string | null>(null);
