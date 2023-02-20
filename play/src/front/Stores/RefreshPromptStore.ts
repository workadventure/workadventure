import { writable } from "svelte/store";

export interface RefreshPromptConfig {
    comment?: string;
    timeToRefresh?: number;
}

export const refreshPromptStore = writable<RefreshPromptConfig | undefined>(undefined);
