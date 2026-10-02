import type { MatrixClient, MatrixEvent, Room, RoomMember, User } from "matrix-js-sdk";
import { SetPresence } from "matrix-js-sdk";
import { readable, writable, type Writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import type { ChatUser } from "../ChatConnection";
import { matrixAvatarProfile } from "./services/MatrixAvatarProfile";

type ChatUserFactoryOptions = {
    username?: string;
    // When provided, the caller owns a store shared across factory calls so live presence updates
    // (MatrixChatConnection.onUserPresenceEvent) reach the rendered ChatUser instead of a snapshot.
    availabilityStatus?: Writable<AvailabilityStatus>;
};

export const chatUserFactory: (
    matrixChatUser: User,
    matrixClient: MatrixClient,
    options?: ChatUserFactoryOptions,
) => ChatUser = (matrixChatUser, matrixClient, options: ChatUserFactoryOptions = {}) => {
    const resolvedUsername =
        options.username?.trim() ||
        matrixChatUser.displayName?.trim() ||
        matrixChatUser.rawDisplayName?.trim() ||
        matrixChatUser.userId;

    return {
        chatId: matrixChatUser.userId,
        username: resolvedUsername,
        roomName: undefined,
        playUri: undefined,
        pictureStore: matrixAvatarProfile.createLazyAvatarStore(matrixChatUser.userId, () =>
            matrixAvatarProfile.resolveUserAvatarUrl(matrixChatUser.userId, matrixClient),
        ),
        color: undefined,
        spaceUserId: undefined,
        availabilityStatus:
            options.availabilityStatus ?? writable(mapMatrixPresenceToAvailabilityStatus(matrixChatUser.presence)),
    };
};

/**
 * The sender as they were when the event was sent, like Element: a later rename does not change older messages.
 * This is also the only place the name of someone who only appears in older history is, as lazy-loaded members
 * leave them out of the room's current state.
 */
export function getEventSenderMember(room: Room, event: MatrixEvent): RoomMember | null {
    // Without a membership event, the SDK's sentinel is a blank member whose name is the user ID.
    if (event.sender?.events.member) {
        return event.sender;
    }
    const senderId = event.getSender();
    return senderId ? room.getMember(senderId) : null;
}

export function chatUserFactoryFromEvent(room: Room, event: MatrixEvent): ChatUser | undefined {
    const userId = event.getSender();
    if (!userId) {
        return undefined;
    }
    const matrixUser = room.client.getUser(userId);
    const roomMember = getEventSenderMember(room, event);
    const displayName =
        roomMember?.name?.trim() || matrixUser?.displayName?.trim() || matrixUser?.rawDisplayName?.trim();
    const pictureUrl = roomMember?.getAvatarUrl(room.client.baseUrl, 48, 48, "scale", false, false) ?? undefined;

    if (matrixUser) {
        return chatUserFactory(matrixUser, room.client, {
            username: displayName,
        });
    }

    if (!roomMember) {
        return undefined;
    }

    return {
        chatId: roomMember.userId,
        username: displayName || roomMember.userId,
        roomName: undefined,
        playUri: undefined,
        pictureStore: readable(pictureUrl),
        color: undefined,
        spaceUserId: undefined,
        availabilityStatus: writable(mapMatrixPresenceToAvailabilityStatus()),
    };
}

export function mapMatrixPresenceToAvailabilityStatus(presence: string = SetPresence.Offline): AvailabilityStatus {
    switch (presence) {
        case SetPresence.Offline:
            return AvailabilityStatus.UNCHANGED;
        case SetPresence.Online:
            return AvailabilityStatus.ONLINE;
        case SetPresence.Unavailable:
            return AvailabilityStatus.AWAY;
        //TODO : use SetPresence.Busy after matrix-js-sdk update
        //case SetPresence.Busy:
        case "busy":
            return AvailabilityStatus.BUSY;
        default:
            console.error(`Do not handle the status ${presence}`);
            return AvailabilityStatus.UNCHANGED;
    }
}
