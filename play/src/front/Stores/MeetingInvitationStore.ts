import { writable } from "svelte/store";

export type MeetingInvitationRequest = {
    senderUserUuid: string;
    senderPlayUri: string;
    senderName: string;
};

/** Pending meeting invitation received (to accept or decline). */
export const meetingInvitationRequestStore = writable<MeetingInvitationRequest | null>(null);
