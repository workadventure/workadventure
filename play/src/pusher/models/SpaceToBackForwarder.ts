import type {
    FilterType,
    PusherToBackSpaceMessage,
    PublicEventFrontToPusher,
    PrivateEventFrontToPusher,
} from "@workadventure/messages";
import { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import { Color } from "@workadventure/shared-utils";

import { clientEventsEmitter } from "../services/ClientEventsEmitter";
import type { PusherWebSocket } from "../services/PusherWebSocket";
import type { PartialSpaceUser, Space, SpaceUserExtended } from "./Space";
import type { EventProcessor } from "./EventProcessor";
import type { SocketData } from "./Websocket/SocketData";
import {
    SpaceUserIdNotFoundError,
    UserAlreadyAddedInSpaceError,
    SocketAlreadyRegisteredInSpaceError,
    UserAlreadyInSpaceError,
} from "./SpaceValidationErrors";

const debug = Debug("space-to-back-forwarder");

// Invitations to another map go through the world space, not the room, so the back's per-room limit
// (GameRoom.isMeetingInvitationRequestTooHigh) does not apply: the sender's pusher caps them, like the client does
// (50 people, 3 invitations per person in 10 minutes, reset when one is accepted). Counted here and not in an
// event processor, which also runs on the receiver's pusher and would count each invitation twice.
// An invitation is one event per tab the receiver has open, hence the limit per receiving tab.
const MEETING_INVITATION_WINDOW_MS = 10 * 60 * 1000;
const MEETING_INVITATION_MAX_RECEIVERS = 50;
const MEETING_INVITATION_MAX_PER_TAB = 3;
// ponytail: per pusher, so the reset on acceptance only works when both users share a pusher, and never pruned for
// senders who leave; move it to the world space in the back (one per world) if that matters.
const meetingInvitationLogBySender = new Map<string, { at: number; receiverUuid: string; receiverTab: string }[]>();

function isMeetingInvitationTooHigh(senderUuid: string, receiverUuid: string, receiverTab: string): boolean {
    const now = Date.now();
    const log = (meetingInvitationLogBySender.get(senderUuid) ?? []).filter(
        (entry) => entry.at > now - MEETING_INVITATION_WINDOW_MS,
    );
    meetingInvitationLogBySender.set(senderUuid, log);
    const receivers = new Set(log.map((entry) => entry.receiverUuid)).add(receiverUuid);
    if (
        receivers.size > MEETING_INVITATION_MAX_RECEIVERS ||
        log.filter((entry) => entry.receiverTab === receiverTab).length >= MEETING_INVITATION_MAX_PER_TAB
    ) {
        return true;
    }
    log.push({ at: now, receiverUuid, receiverTab });
    return false;
}

export interface SpaceToBackForwarderInterface {
    registerUser(client: PusherWebSocket, filterType: FilterType): Promise<void>;
    updateUser(spaceUser: PartialSpaceUser, updateMask: string[]): void;
    unregisterUser(socket: PusherWebSocket): Promise<void>;
    updateMetadata(metadata: { [key: string]: unknown }, senderId: string): void;
    forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]): void;
    syncLocalUsersWithServer(localUsers: SpaceUser[]): void;
    addUserToNotify(user: SpaceUser): void;
    deleteUserFromNotify(user: SpaceUser): void;
    leaveSpace(): void;
    sendPublicEvent(event: PublicEventFrontToPusher, senderSocket: SocketData): void;
    sendPrivateEvent(event: PrivateEventFrontToPusher, senderSocket: SocketData): void;
}

export class SpaceToBackForwarder implements SpaceToBackForwarderInterface {
    constructor(
        private readonly _space: Space,
        private readonly eventProcessor: EventProcessor,
        private readonly _clientEventsEmitter = clientEventsEmitter,
    ) {}
    async registerUser(client: PusherWebSocket, filterType: FilterType): Promise<void> {
        const socketData = client.getUserData();
        const spaceUserId = socketData.spaceUserId;

        if (!spaceUserId) {
            throw new SpaceUserIdNotFoundError();
        }

        if (this._space._localConnectedUser.has(spaceUserId)) {
            throw new UserAlreadyAddedInSpaceError(
                `User ${spaceUserId} already added in space ${this._space.name}`,
                this._space.name,
                spaceUserId,
            );
        }
        if (this._space._localConnectedUserWithSpaceUser.has(client)) {
            throw new SocketAlreadyRegisteredInSpaceError(
                `PusherWebSocket already registered in space ${this._space.name}`,
                this._space.name,
            );
        }
        if (socketData.spaces.has(this._space.name)) {
            throw new UserAlreadyInSpaceError(
                `User ${socketData.name} is trying to join a space they are already in.`,
                this._space.name,
                socketData.name,
            );
        }

        debug(
            `${this._space.name} : user added ${socketData.name}. User count ${this._space._localConnectedUser.size}`,
        );

        const spaceUser: SpaceUserExtended = {
            ...SpaceUser.fromPartial({
                spaceUserId,
                uuid: socketData.userUuid,
                name: socketData.name,
                playUri: socketData.roomId,
                roomName: socketData.roomName === "" ? undefined : socketData.roomName,
                availabilityStatus: socketData.availabilityStatus,
                isLogged: socketData.isLogged,
                color: Color.getColorByString(socketData.name),
                tags: socketData.tags,
                cameraState: false,
                screenSharingState: false,
                microphoneState: false,
                megaphoneState: false,
                characterTextures: socketData.characterTextures,
                visitCardUrl: socketData.visitCardUrl ?? undefined,
                chatID: socketData.chatID ?? undefined,
            }),
            lowercaseName: socketData.name.toLowerCase(),
        };

        try {
            socketData.spaces.add(this._space.name);

            this._space._localConnectedUserWithSpaceUser.set(client, spaceUser);

            this._space._localConnectedUser.set(spaceUserId, client);

            await this._space.query.send({
                $case: "addSpaceUserQuery",
                addSpaceUserQuery: {
                    spaceName: this._space.name,
                    user: spaceUser,
                    filterType: filterType,
                },
            });

            debug(`${this._space.name} : user add sent ${spaceUser.spaceUserId}`);
        } catch (e) {
            socketData.spaces.delete(this._space.name);
            this._space._localConnectedUser.delete(spaceUser.spaceUserId);
            this._space._localWatchers.delete(spaceUser.spaceUserId);
            this._space._localConnectedUserWithSpaceUser.delete(client);
            if (this._space.isEmpty()) {
                this._space.cleanup();
            }
            throw e;
        }
    }

    updateUser(spaceUser: PartialSpaceUser, updateMask: string[]): void {
        const spaceUserId = spaceUser.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }

        const spaceUserFromPusher = this._space._localConnectedUser.get(spaceUserId);

        if (!spaceUserFromPusher) {
            throw new Error("spaceUser not found");
        }

        this.forwardMessageToSpaceBack({
            $case: "updateSpaceUserMessage",
            updateSpaceUserMessage: {
                spaceName: this._space.name,
                user: SpaceUser.fromPartial(spaceUser),
                updateMask,
            },
        });
    }

    // Unregistering awaits a round trip to the back. A second call for the same socket during that
    // await (e.g. an explicit leave overlapping with the socket-close sweep) must not resend the
    // delete-to-notify / remove messages: the back would receive them after the user is gone.
    private readonly unregisteringSockets = new Map<PusherWebSocket, Promise<void>>();

    unregisterUser(socket: PusherWebSocket): Promise<void> {
        const inFlight = this.unregisteringSockets.get(socket);
        if (inFlight) {
            return inFlight;
        }
        const promise = this.doUnregisterUser(socket).finally(() => {
            this.unregisteringSockets.delete(socket);
        });
        this.unregisteringSockets.set(socket, promise);
        return promise;
    }

    private async doUnregisterUser(socket: PusherWebSocket): Promise<void> {
        const userData = socket.getUserData();

        const spaceUserId = userData.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }

        if (!this._space._localConnectedUser.has(spaceUserId)) {
            console.error(`Trying to remove user ${spaceUserId} that does not exist in space ${this._space.name}`);
            Sentry.captureException(
                new Error(`Trying to remove user ${spaceUserId} that does not exist in space ${this._space.name}`),
            );
        }

        const spaceUser = this._space._localConnectedUserWithSpaceUser.get(socket);

        if (spaceUser) {
            this.deleteUserFromNotify(spaceUser);
        }

        try {
            await this._space.query.send({
                $case: "removeSpaceUserQuery",
                removeSpaceUserQuery: {
                    spaceName: this._space.name,
                    spaceUserId,
                },
                // TODO: we should consider adding an abort signal here
            });
        } finally {
            userData.spaces.delete(this._space.name);
            this._space._localConnectedUser.delete(spaceUserId);
            this._space._localWatchers.delete(spaceUserId);
            this._space._localConnectedUserWithSpaceUser.delete(socket);
            if (this._space.isEmpty()) {
                this._space.cleanup();
            }
        }

        debug(
            `${this._space.name} : watcher removed ${userData.name}. Watcher count ${this._space._localConnectedUser.size}`,
        );

        debug(`${this._space.name} : user remove sent ${spaceUserId}`);
    }

    updateMetadata(metadata: { [key: string]: unknown }, senderId: string): void {
        const senderSocket = this._space._localConnectedUser.get(senderId);
        if (!senderSocket) {
            throw new Error("Sender socket not found");
        }

        this.forwardMessageToSpaceBack({
            $case: "updateSpaceMetadataPusherToBackMessage",
            updateSpaceMetadataPusherToBackMessage: {
                spaceName: this._space.name,
                metadata: JSON.stringify(metadata),
                senderId,
            },
        });
    }

    forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]): void {
        if (!this._space.spaceStreamToBackPromise) {
            throw new Error("Space stream to back not found");
        }
        this._space.spaceStreamToBackPromise
            .then((spaceStreamToBack) => {
                if (spaceStreamToBack.closed) {
                    console.warn("Trying to forward message to space back but the connection is closed", {
                        spaceName: this._space.name,
                        messageCase: pusherToBackSpaceMessage?.$case,
                    });
                    return;
                }
                spaceStreamToBack.write(
                    {
                        message: pusherToBackSpaceMessage,
                    },
                    (error: unknown) => {
                        if (error) {
                            console.error("Error while forwarding message to space back", error);
                            Sentry.captureException(error);
                        }
                    },
                );

                if (pusherToBackSpaceMessage && pusherToBackSpaceMessage.$case) {
                    this._clientEventsEmitter.emitSpaceEvent(this._space.name, pusherToBackSpaceMessage.$case);
                }
            })
            .catch((error) => {
                console.error("Error while forwarding message to space back", error);
                Sentry.captureException(error);
            });
    }

    syncLocalUsersWithServer(localUsers: SpaceUser[]): void {
        this.forwardMessageToSpaceBack({
            $case: "syncSpaceUsersMessage",
            syncSpaceUsersMessage: {
                spaceName: this._space.name,
                users: localUsers,
            },
        });
    }

    addUserToNotify(user: SpaceUser): void {
        this.forwardMessageToSpaceBack({
            $case: "addSpaceUserToNotifyMessage",
            addSpaceUserToNotifyMessage: {
                spaceName: this._space.name,
                user,
            },
        });
    }

    deleteUserFromNotify(user: SpaceUser): void {
        this.forwardMessageToSpaceBack({
            $case: "deleteSpaceUserToNotifyMessage",
            deleteSpaceUserToNotifyMessage: {
                spaceName: this._space.name,
                user,
            },
        });
    }
    leaveSpace(): void {
        this.forwardMessageToSpaceBack({
            $case: "leaveSpaceMessage",
            leaveSpaceMessage: {
                spaceName: this._space.name,
            },
        });
    }

    sendPublicEvent(event: PublicEventFrontToPusher, senderSocket: SocketData): void {
        const senderSpaceUser = this._space.users.get(senderSocket.spaceUserId || "");

        if (!event.spaceEvent?.event) {
            throw new Error("Event is required in spaceEvent");
        }

        const processedEvent = this.eventProcessor.processPublicEvent(
            event.spaceEvent.event,
            senderSpaceUser,
            senderSocket,
        );

        this.forwardMessageToSpaceBack({
            $case: "publicEvent",
            publicEvent: {
                senderUserId: senderSocket.spaceUserId,
                spaceEvent: {
                    event: processedEvent,
                },
                spaceName: this._space.name,
            },
        });
    }

    sendPrivateEvent(event: PrivateEventFrontToPusher, senderSocket: SocketData): void {
        const senderSpaceUser = this._space.users.get(senderSocket.spaceUserId);

        if (!event.spaceEvent?.event) {
            throw new Error("Event is required in spaceEvent");
        }

        const spaceEvent = event.spaceEvent.event;
        const receiverUuid = this._space.users.get(event.receiverUserId)?.uuid ?? event.receiverUserId;
        if (
            spaceEvent.$case === "meetingInvitationRequest" &&
            senderSpaceUser &&
            !senderSpaceUser.tags.includes("admin") &&
            isMeetingInvitationTooHigh(senderSpaceUser.uuid, receiverUuid, event.receiverUserId)
        ) {
            throw new Error("Too many meeting invitations");
        }
        if (spaceEvent.$case === "meetingInvitationResponse" && spaceEvent.meetingInvitationResponse.accept) {
            meetingInvitationLogBySender.delete(receiverUuid);
        }

        const processedEvent = this.eventProcessor.processPrivateEvent(spaceEvent, senderSpaceUser);

        this.forwardMessageToSpaceBack({
            $case: "privateEvent",
            privateEvent: {
                senderUserId: senderSocket.spaceUserId,
                receiverUserId: event.receiverUserId,
                spaceEvent: {
                    event: processedEvent,
                },
                spaceName: this._space.name,
            },
        });
    }
}
