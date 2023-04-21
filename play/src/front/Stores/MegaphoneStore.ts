import { writable } from "svelte/store";

export const megaphoneEnabledStore = writable<boolean>(false);
export const megaphoneCanBeUsedStore = writable<boolean>(false);