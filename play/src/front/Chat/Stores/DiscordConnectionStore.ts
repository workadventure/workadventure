import { writable } from "svelte/store";

export const enableDiscordBridge = writable(true);
export const connectionStatus = writable(false);
export const storedQrCodeUrl = writable("");
