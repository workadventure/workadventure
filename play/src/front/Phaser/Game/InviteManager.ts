import type { Subscription } from "rxjs";
import { AskPositionMessage_AskType } from "@workadventure/messages";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { meetingInvitationRequestStore } from "../../Stores/MeetingInvitationStore";
import { toastStore } from "../../Stores/ToastStore";
// Svelte component used for declined toast (runtime import for toastStore.addToast)
import MeetingInvitationDeclinedToast from "../../Components/MeetingInvitation/MeetingInvitationDeclinedToast.svelte";
import MeetingInvitationAcceptedToast from "../../Components/MeetingInvitation/MeetingInvitationAcceptToast.svelte";
import MeetingInvitationLimitToast from "../../Components/MeetingInvitation/MeetingInvitationLimitToast.svelte";

const MEETING_INVITATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MEETING_INVITATION_MAX_REQUESTS = 50;
const MEETING_INVITATION_MAX_PER_USER = 3;

interface InviteRequestLogEntry {
    at: number;
    receiverUserUuid: string;
}

export type MeetingInvitationRequest = {
    senderUserUuid: string;
    senderPlayUri: string;
    senderName: string;
};

export class InviteManager {
    private subscriptions: Subscription[] = [];
    private inviteRequestLog: InviteRequestLogEntry[] = [];

    constructor(private connection: RoomConnection) {
        // Show meeting invitation request received toast when the meeting invitation request is received
        this.subscriptions.push(
            this.connection.meetingInvitationRequestReceivedStream.subscribe((payload) => {
                meetingInvitationRequestStore.set({
                    senderUserUuid: payload.senderUserUuid,
                    senderPlayUri: payload.senderPlayUri,
                    senderName: payload.senderName,
                });
            })
        );

        // Show accepted or declined toast when the meeting invitation response is received
        this.subscriptions.push(
            this.connection.meetingInvitationResponseReceivedStream.subscribe((payload) => {
                if (!payload.accepted) {
                    const toastId = `meeting-invitation-declined-${Date.now()}`;
                    toastStore.addToast(
                        MeetingInvitationDeclinedToast,
                        {
                            responderName: payload.responderName,
                            toastUuid: toastId,
                        },
                        toastId
                    );
                }
                if (payload.accepted) {
                    const toastId = `meeting-invitation-accepted-${Date.now()}`;
                    toastStore.addToast(
                        MeetingInvitationAcceptedToast,
                        {
                            responderName: payload.responderName,
                            toastUuid: toastId,
                        },
                        toastId
                    );
                }
            })
        );

        // Show limit reached toast when the number of meeting invitation requests per sender is too high
        this.subscriptions.push(
            this.connection.meetingInvitationRequestTooHighStream.subscribe(() => {
                this.showLimitReachedToast();
            })
        );
    }

    public handleAccept(request: MeetingInvitationRequest): void {
        this.connection.emitMeetingInvitationResponse(true, request.senderUserUuid);
        this.connection.emitAskPosition(request.senderUserUuid, request.senderPlayUri, AskPositionMessage_AskType.MOVE);
    }

    public handleDecline(request: MeetingInvitationRequest): void {
        this.connection.emitMeetingInvitationResponse(false, request.senderUserUuid);
    }

    /**
     * Sends a meeting invitation request if antispam limits are not exceeded.
     * Limits: max 50 requests in 10 minutes, max 3 requests to the same user in 10 minutes.
     * @returns true if the request was sent, false if blocked by limits
     */
    public requestMeetingInvitation(receiverUserUuid: string): boolean {
        const now = Date.now();
        const cutoff = now - MEETING_INVITATION_WINDOW_MS;
        this.inviteRequestLog = this.inviteRequestLog.filter((e) => e.at > cutoff);

        if (this.inviteRequestLog.length >= MEETING_INVITATION_MAX_REQUESTS) {
            this.showLimitReachedToast();
            return false;
        }
        const toSameUser = this.inviteRequestLog.filter((e) => e.receiverUserUuid === receiverUserUuid).length;
        if (toSameUser >= MEETING_INVITATION_MAX_PER_USER) {
            this.showLimitReachedToast();
            return false;
        }

        this.inviteRequestLog.push({ at: now, receiverUserUuid });
        this.connection.emitMeetingInvitationRequest(receiverUserUuid);
        return true;
    }

    private showLimitReachedToast(): void {
        const toastId = `meeting-invitation-limit-${Date.now()}`;
        toastStore.addToast(MeetingInvitationLimitToast, { toastUuid: toastId }, toastId);
    }

    public close(): void {
        this.subscriptions.forEach((s) => s.unsubscribe());
        this.subscriptions.length = 0;
        meetingInvitationRequestStore.set(null);
    }
}
