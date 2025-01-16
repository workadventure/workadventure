import { MatrixClient, SetPresence, User } from "matrix-js-sdk/src/matrix";
import { writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { ChatUser } from "../ChatConnection";

export const chatUserFactory: (matrixChatUser: User, matrixClient: MatrixClient) => ChatUser = (
    matrixChatUser,
    matrixClient
) => {
    return {
        chatId: matrixChatUser.userId,
        username: matrixChatUser.rawDisplayName,
        roomName: undefined,
        playUri: undefined,
        avatarUrl: matrixClient.mxcUrlToHttp(matrixChatUser.avatarUrl ?? "", 48, 48) ?? undefined,
        color: undefined,
        id: undefined,
        availabilityStatus: writable(mapMatrixPresenceToAvailabilityStatus(matrixChatUser.presence)),
    };
};

export function mapMatrixPresenceToAvailabilityStatus(presence: string = SetPresence.Offline): AvailabilityStatus {
    switch (presence) {
        case SetPresence.Offline:
            return AvailabilityStatus.UNCHANGED;
        case SetPresence.Online:
            return AvailabilityStatus.ONLINE;
        case SetPresence.Unavailable:
            return AvailabilityStatus.AWAY;
        default:
            //TODO : Create Error
            throw new Error(`Do not handle the status ${presence}`);
    }
}
