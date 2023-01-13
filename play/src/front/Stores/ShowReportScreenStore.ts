import { writable } from "svelte/store";

export const userReportEmpty = {
    userId: 0,
    userName: "Empty",
};

export const showReportScreenStore = writable<{ userId: number; userName: string }>(userReportEmpty);
