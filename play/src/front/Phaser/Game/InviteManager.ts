import type { Subscription } from "rxjs";
import type { MeetingInvitationRequestReceivedMessage } from "@workadventure/messages";
import { AskPositionMessage_AskType } from "@workadventure/messages";
import { get } from "svelte/store";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { meetingInvitationRequestStore } from "../../Stores/MeetingInvitationStore";
import { toastStore } from "../../Stores/ToastStoreSingleton";
import { gameManager } from "../../Phaser/Game/GameManager";
// Svelte component used for declined toast (runtime import for toastStore.addToast)
import MeetingInvitationDeclinedToast from "../../Components/MeetingInvitation/MeetingInvitationDeclinedToast.svelte";
import MeetingInvitationAcceptedToast from "../../Components/MeetingInvitation/MeetingInvitationAcceptToast.svelte";
import MeetingInvitationLimitToast from "../../Components/MeetingInvitation/MeetingInvitationLimitToast.svelte";
import { analyticsClient } from "../../Administration/AnalyticsClient";

const MEETING_INVITATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MEETING_INVITATION_MAX_REQUESTS = 50;
const MEETING_INVITATION_MAX_PER_USER = 3;
// How long an accepted invitation lets the invitee into a locked bubble or area. Same value as in the back.
const LOCK_PASS_DURATION_MS = 2 * 60 * 1000;

interface InviteRequestLogEntry {
    at: number;
    receiverUserUuid: string;
}

export class InviteManager {
    private subscriptions: Subscription[] = [];
    private inviteRequestLog: InviteRequestLogEntry[] = [];
    // Set when we accept an invitation, until the position of the person who invited us comes back
    private lockPassExpiresAt: number | undefined;

    constructor(private connection: RoomConnection) {
        // Show meeting invitation request received toast when the meeting invitation request is received
        this.subscriptions.push(
            this.connection.meetingInvitationRequestReceivedStream.subscribe((payload) => {
                meetingInvitationRequestStore.set(payload);
                // Play a short sound to notify the user that a meeting request has arrived
                const scene = gameManager.getCurrentGameScene();
                if (scene) {
                    scene.playMeetingInSound();
                }
            }),
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
                        toastId,
                    );
                }
                if (payload.accepted) {
                    // The invitee stays in their bubble: we walk to them, through their locks
                    if (payload.bringSender) {
                        this.lockPassExpiresAt = Date.now() + LOCK_PASS_DURATION_MS;
                    }
                    const toastId = `meeting-invitation-accepted-${Date.now()}`;
                    toastStore.addToast(
                        MeetingInvitationAcceptedToast,
                        {
                            responderName: payload.responderName,
                            bringingYou: payload.bringSender === true,
                            toastUuid: toastId,
                        },
                        toastId,
                    );
                    // When the invitee accepts, reset the sender's antispam counter so they can send invites again
                    this.inviteRequestLog = [];
                }
            }),
        );

        // Show limit reached toast when the number of meeting invitation requests per sender is too high
        this.subscriptions.push(
            this.connection.meetingInvitationRequestTooHighStream.subscribe(() => {
                this.showLimitReachedToast();
            }),
        );

        // Clear the invitation if the user accepts or declines the invitation
        this.subscriptions.push(
            this.connection.meetingInvitationRequestClosedStream.subscribe(() => {
                meetingInvitationRequestStore.set(null);
            }),
        );

        // Open the locked areas where the person who invited us stands, before we go there
        this.subscriptions.push(
            this.connection.moveToPositionMessageStream.subscribe((message) => {
                const expiresAt = this.lockPassExpiresAt;
                this.lockPassExpiresAt = undefined;
                if (!message.position || expiresAt === undefined || expiresAt <= Date.now()) {
                    return;
                }
                gameManager
                    .getCurrentGameScene()
                    .getGameMapFrontWrapper()
                    .areasManager?.grantLockPass(message.position, expiresAt - Date.now());
            }),
        );

        // Clear the invitation if the user left the room
        this.subscriptions.push(
            this.connection.userLeftMessageStream.subscribe((payload) => {
                if (payload.userId === get(meetingInvitationRequestStore)?.senderUserId) {
                    meetingInvitationRequestStore.set(null);
                }
            }),
        );
    }

    /**
     * Accepts the invitation and walks to the person who invited us, even through a lock (see AreasManager.grantLockPass).
     */
    public handleAccept(request: MeetingInvitationRequestReceivedMessage): void {
        this.connection.emitMeetingInvitationResponse(true, request.senderUserUuid);
        analyticsClient.trackAdminEvent("invite.accepted", { inviteType: "meeting" });
        this.lockPassExpiresAt = Date.now() + LOCK_PASS_DURATION_MS;
        // TODO: Change emitAskPosition to a server query to allow for error handling
        // NOTE: For now, if the user leaves while their position is being requested, nothing happens
        this.connection.emitAskPosition(
            request.senderUserUuid,
            request.senderPlayUri,
            AskPositionMessage_AskType.MOVE,
            request.senderUserId,
        );
    }

    /**
     * Accepts the invitation but stays here (in our bubble): the person who invited us walks to us instead.
     */
    public handleBring(request: MeetingInvitationRequestReceivedMessage): void {
        this.connection.emitMeetingInvitationResponse(true, request.senderUserUuid, true);
        analyticsClient.trackAdminEvent("invite.accepted", { inviteType: "meeting" });
    }

    public handleDecline(request: MeetingInvitationRequestReceivedMessage): void {
        this.connection.emitMeetingInvitationResponse(false, request.senderUserUuid);
    }

    /**
     * Sends a meeting invitation request if antispam limits are not exceeded.
     * Limits: max 50 requests in 10 minutes, max 3 requests to the same user in 10 minutes.
     * Admins (moderators) are not subject to these limits.
     * @returns true if the request was sent, false if blocked by limits
     */
    public requestMeetingInvitation(receiverUserUuid: string, receiverUserId?: number): boolean {
        const isAdmin = this.connection.isAdmin();

        if (!isAdmin) {
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
        }

        this.connection.emitMeetingInvitationRequest(receiverUserUuid, receiverUserId);
        analyticsClient.trackAdminEvent("invite.sent", { inviteType: "meeting" });
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
