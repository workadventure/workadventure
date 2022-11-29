import { writable } from "svelte/store";

export const showLimitRoomModalStore = writable(false);

export const modalVisibilityStore = writable(false);
export const modalIframeSrcStore = writable<string | null>(null);
export const modalIframeTitleStore = writable<string | null>(null);
export const modalIframeAllowStore = writable<string | null>(null);
export const modalIframeAllowApi = writable(false);

enum modalPositionEnum {
    right = "right",
    left = "left",
    center = "center",
}
export const modalPositionStore = writable<string>(modalPositionEnum.right);
