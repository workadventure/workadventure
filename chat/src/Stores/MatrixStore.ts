import { writable } from "svelte/store";
import { RoomWrapper } from "../Matrix/MatrixClient";

export const selectedRoom = writable<RoomWrapper | undefined>(undefined);
