import { writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";

export const displayVideoQualityStore = writable<boolean>(localUserStore.getDisplayVideoQualityStats());
