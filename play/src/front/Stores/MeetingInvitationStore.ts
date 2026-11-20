import type { MeetingInvitationRequestReceivedMessage } from "@workadventure/messages";
import { writable } from "svelte/store";
import type { SpaceUserExtended } from "../Space/SpaceInterface";

/** A meeting invitation received. senderRoomName is set when the sender is on another map. */
export type MeetingInvitationRequest = MeetingInvitationRequestReceivedMessage & { senderRoomName?: string };

/** Pending meeting invitation received (to accept or decline). */
export const meetingInvitationRequestStore = writable<MeetingInvitationRequest | null>(null);

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
