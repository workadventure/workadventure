import { writable } from "svelte/store";
import type { Room } from "../Connection/Room";

/** The current room once it has been started, or undefined before that. */
export const currentRoomStore = writable<Room | undefined>(undefined);
