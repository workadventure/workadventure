import { writable } from "svelte/store";

export const userMovingStore = writable(false);

export const requestVisitCardsStore = writable<string|null>(null);
