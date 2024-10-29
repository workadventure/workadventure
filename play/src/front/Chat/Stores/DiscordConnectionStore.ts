import { writable } from 'svelte/store';

export const connectionStatus = writable(false);
export const storedQrCodeUrl = writable("");