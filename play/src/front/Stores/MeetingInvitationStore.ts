import type { MeetingInvitationRequestReceivedMessage } from "@workadventure/messages";
import { writable } from "svelte/store";

/** Pending meeting invitation received (to accept or decline). */
export const meetingInvitationRequestStore = writable<MeetingInvitationRequestReceivedMessage | null>(null);

/** Participant in the current meeting (space). Filled from the space the user is in (bubble, meeting room, etc.). */
export type MeetingParticipant = {
    spaceUserId: string;
    name: string;
    uuid?: string;
    playUri?: string;
    roomName?: string;
    tags: string[];
    cameraState: boolean;
    microphoneState: boolean;
    screenSharingState: boolean;
};
