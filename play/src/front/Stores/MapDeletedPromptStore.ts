import { writable } from "svelte/store";

export interface MapDeletedPromptConfig {
    title?: string;
    subtitle?: string;
    details?: string;
}

export const mapDeletedPromptStore = writable<MapDeletedPromptConfig | undefined>(undefined);
