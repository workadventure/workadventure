import { writable } from "svelte/store";
import { ModalEvent } from "../Api/Events/ModalEvent";

export const showLimitRoomModalStore = writable(false);

export const modalIframeStore = writable<ModalEvent | null>(null);
export const modalVisibilityStore = writable(false);

export const showModalGlobalComminucationVisibilityStore = writable(false);

export const roomListVisibilityStore = writable<boolean>(false);
