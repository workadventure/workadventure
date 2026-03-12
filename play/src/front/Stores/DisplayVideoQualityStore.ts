import { writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore.ts";

export const displayVideoQualityStore = writable<boolean>(localUserStore.getDisplayVideoQualityStats());
