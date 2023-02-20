import { writable } from "svelte/store";

export const helpCameraSettingsVisibleStore = writable(false);
export const helpWebRtcSettingsVisibleStore = writable<"pending" | "error" | "hidden">("hidden");
