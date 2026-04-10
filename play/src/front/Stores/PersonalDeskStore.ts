import type { AreaData } from "@workadventure/map-editor";
import { writable } from "svelte/store";

export const isInsidePersonalAreaStore = writable(false);

export const personalAreaDataStore = writable<AreaData | null>(null);
