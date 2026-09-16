import type { MatrixClient, Room, User } from "matrix-js-sdk";
import { readable, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import type { ChatUser } from "../ChatConnection";
import { matrixAvatarProfile } from "./services/MatrixAvatarProfile";

type ChatUserFactoryOptions = {
    username?: string;
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
        availabilityStatus: writable(AvailabilityStatus.UNCHANGED),
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
        availabilityStatus: writable(AvailabilityStatus.UNCHANGED),
    };
}
