import { writable } from "svelte/store";
import { LayoutMode } from "../WebRtc/LayoutManager";

export const embedScreenLayoutStore = writable<LayoutMode>(LayoutMode.Presentation);
