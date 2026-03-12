import { writable } from "svelte/store";
import { LayoutMode } from "../WebRtc/LayoutManager.ts";

export const embedScreenLayoutStore = writable<LayoutMode>(LayoutMode.Presentation);
