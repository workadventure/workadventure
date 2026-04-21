import type { MatrixClient, Room, User } from "matrix-js-sdk";
import { SetPresence } from "matrix-js-sdk";
import { readable, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import type { ChatUser } from "../ChatConnection";

type ChatUserFactoryOptions = {
    username?: string;
    pictureUrl?: string;
};

export const chatUserFactory: (
    matrixChatUser: User,
    matrixClient: MatrixClient,
    options?: ChatUserFactoryOptions
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
        pictureStore: readable(
            options.pictureUrl ?? matrixClient.mxcUrlToHttp(matrixChatUser.avatarUrl ?? "", 48, 48) ?? undefined
        ),
        color: undefined,
        spaceUserId: undefined,
        availabilityStatus: writable(mapMatrixPresenceToAvailabilityStatus(matrixChatUser.presence)),
    };
};

export function chatUserFactoryFromRoom(room: Room, userId: string): ChatUser | undefined {
    const matrixUser = room.client.getUser(userId);
    const roomMember = room.getMember(userId);
    const displayName =
        roomMember?.name?.trim() || matrixUser?.displayName?.trim() || matrixUser?.rawDisplayName?.trim();
    const pictureUrl = roomMember?.getAvatarUrl(room.client.baseUrl, 48, 48, "scale", false, false) ?? undefined;

    if (matrixUser) {
        return chatUserFactory(matrixUser, room.client, {
            username: displayName,
            pictureUrl,
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
