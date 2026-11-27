import type { Subscription } from "rxjs";
import type { PrivateSpaceEvent } from "@workadventure/messages";
import { AskPositionMessage_AskType } from "@workadventure/messages";
import { get } from "svelte/store";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { MeetingInvitationRequest } from "../../Stores/MeetingInvitationStore";
import { meetingInvitationRequestStore } from "../../Stores/MeetingInvitationStore";
import type { SpaceInterface } from "../../Space/SpaceInterface";
import { scriptUtils } from "../../Api/ScriptUtils";
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

interface InviteRequestLogEntry {
    at: number;
    receiverUserUuid: string;
}

export class InviteManager {
    private subscriptions: Subscription[] = [];
    private inviteRequestLog: InviteRequestLogEntry[] = [];
    private worldSpace: SpaceInterface | undefined;

    /**
     * @param roomUrl The map the user is on: invitations to and from users on other maps go through the world space.
     */
    constructor(
        private connection: RoomConnection,
        private roomUrl: string,
    ) {
        // Show meeting invitation request received toast when the meeting invitation request is received
        this.subscriptions.push(
            this.connection.meetingInvitationRequestReceivedStream.subscribe((payload) => {
                this.showRequest(payload);
            }),
        );

        // Show accepted or declined toast when the meeting invitation response is received
        this.subscriptions.push(
            this.connection.meetingInvitationResponseReceivedStream.subscribe((payload) => {
                this.showResponse(payload.accepted, payload.responderName);
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
     * Listens to the invitations sent from other maps, through the world space (joined after the room connection).
     */
    public setWorldSpace(worldSpace: SpaceInterface): void {
        this.worldSpace = worldSpace;
        this.subscriptions.push(
            worldSpace.observePrivateEvent("meetingInvitationRequest").subscribe(({ sender }) => {
                this.showRequest({
                    senderUserUuid: sender.uuid,
                    senderPlayUri: sender.playUri,
                    senderName: sender.name,
                    senderRoomName: sender.roomName,
                });
            }),
        );
        this.subscriptions.push(
            worldSpace
                .observePrivateEvent("meetingInvitationResponse")
                .subscribe(({ meetingInvitationResponse, sender }) => {
                    this.showResponse(meetingInvitationResponse.accept, sender.name);
                }),
        );
    }

    private showRequest(request: MeetingInvitationRequest): void {
        meetingInvitationRequestStore.set(request);
        // Play a short sound to notify the user that a meeting request has arrived
        const scene = gameManager.getCurrentGameScene();
        if (scene) {
            scene.playMeetingInSound();
        }
    }

    private showResponse(accepted: boolean, responderName: string): void {
        if (!accepted) {
            const toastId = `meeting-invitation-declined-${Date.now()}`;
            toastStore.addToast(
                MeetingInvitationDeclinedToast,
                {
                    responderName: responderName,
                    toastUuid: toastId,
                },
                toastId,
            );
        }
        if (accepted) {
            const toastId = `meeting-invitation-accepted-${Date.now()}`;
            toastStore.addToast(
                MeetingInvitationAcceptedToast,
                {
                    responderName: responderName,
                    toastUuid: toastId,
                },
                toastId,
            );
            // When the invitee accepts, reset the sender's antispam counter so they can send invites again
            this.inviteRequestLog = [];
        }
    }

    public handleAccept(request: MeetingInvitationRequest): void {
        analyticsClient.trackAdminEvent("invite.accepted", { inviteType: "meeting" });
        if (request.senderPlayUri !== this.roomUrl) {
            this.emitToWorldSpaceUser(request.senderUserUuid, {
                $case: "meetingInvitationResponse",
                meetingInvitationResponse: { accept: true },
            });
            // Same as Teleport in the user list: the new map walks to the sender once loaded
            scriptUtils.goToPage(`${request.senderPlayUri}#moveToUser=${request.senderUserUuid}`);
            return;
        }
        this.connection.emitMeetingInvitationResponse(true, request.senderUserUuid);
        // TODO: Change emitAskPosition to a server query to allow for error handling
        // NOTE: For now, if the user leaves while their position is being requested, nothing happens
        this.connection.emitAskPosition(
            request.senderUserUuid,
            request.senderPlayUri,
            AskPositionMessage_AskType.MOVE,
            request.senderUserId,
        );
    }

    public handleDecline(request: MeetingInvitationRequest): void {
        if (request.senderPlayUri !== this.roomUrl) {
            this.emitToWorldSpaceUser(request.senderUserUuid, {
                $case: "meetingInvitationResponse",
                meetingInvitationResponse: { accept: false },
            });
            return;
        }
        this.connection.emitMeetingInvitationResponse(false, request.senderUserUuid);
    }

    /**
     * Sends a meeting invitation request if antispam limits are not exceeded.
     * Limits: max 50 requests in 10 minutes, max 3 requests to the same user in 10 minutes.
     * Admins (moderators) are not subject to these limits.
     * @param receiverPlayUri The map the receiver is on, when known: on another map, the invitation goes through the world space.
     * @returns true if the request was sent, false if blocked by limits
     */
    public requestMeetingInvitation(
        receiverUserUuid: string,
        receiverUserId?: number,
        receiverPlayUri?: string,
    ): boolean {
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

        if (receiverPlayUri !== undefined && receiverPlayUri !== this.roomUrl) {
            this.emitToWorldSpaceUser(receiverUserUuid, {
                $case: "meetingInvitationRequest",
                meetingInvitationRequest: {},
            });
        } else {
            this.connection.emitMeetingInvitationRequest(receiverUserUuid, receiverUserId);
        }
        analyticsClient.trackAdminEvent("invite.sent", { inviteType: "meeting" });
        return true;
    }

    /**
     * Sends the event to every tab the user has open in the world (a user can be connected several times).
     */
    private emitToWorldSpaceUser(userUuid: string, event: NonNullable<PrivateSpaceEvent["event"]>): void {
        const worldSpace = this.worldSpace;
        if (!worldSpace) {
            console.warn("The world space is not joined yet: cannot reach a user on another map");
            return;
        }
        for (const user of get(worldSpace.usersStore).values()) {
            if (user.uuid === userUuid && user.spaceUserId !== worldSpace.mySpaceUserId) {
                worldSpace.emitPrivateMessage(event, user.spaceUserId);
            }
        }
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
