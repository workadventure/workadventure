import { writable } from "svelte/store";

export const userReportEmpty = {
    userUuid: "",
    userName: "Empty",
};

export const showReportScreenStore = writable<{ userUuid: string; userName: string }>(userReportEmpty);
export const showIssueReportFormStore = writable(false);