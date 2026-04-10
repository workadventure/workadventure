import type { MeetingInvitationRequestReceivedMessage } from "@workadventure/messages";
import { writable } from "svelte/store";
import type { SpaceUserExtended } from "../Space/SpaceInterface";

/** Pending meeting invitation received (to accept or decline). */
export const meetingInvitationRequestStore = writable<MeetingInvitationRequestReceivedMessage | null>(null);

/** Participant in the current meeting (space). Pick of SpaceUserExtended for list/UI usage (includes pictureStore). */
export type MeetingParticipant = Pick<
    SpaceUserExtended,
    | "spaceUserId"
    | "name"
    | "uuid"
    | "pictureStore"
    | "playUri"
    | "roomName"
    | "tags"
    | "cameraState"
    | "microphoneState"
    | "screenSharingState"
>;
