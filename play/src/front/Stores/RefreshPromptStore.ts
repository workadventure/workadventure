import { writable } from "svelte/store";

export interface RefreshPromptConfig {
    timeToRefresh?: number;
}

export const refreshPromptStore = writable<RefreshPromptConfig | undefined>(undefined);
