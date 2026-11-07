import { writable } from "svelte/store";
import type { ModalEvent } from "../Api/Events/ModalEvent";

export const showLimitRoomModalStore = writable(false);

export const modalIframeStore = writable<ModalEvent | null>(null);
export const modalVisibilityStore = writable(false);

/** The global communication window, opened on the text announcement composer or on the megaphone ("live"). */
export const showModalGlobalComminucationVisibilityStore = writable<false | "text" | "live">(false);

export const roomListVisibilityStore = writable<boolean>(false);
