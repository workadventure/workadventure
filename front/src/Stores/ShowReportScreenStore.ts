import { writable } from "svelte/store";

export const showReportScreenStore = writable<{ userId: number; userName: string } | null>(null);
