import { MatrixClient, SetPresence, User } from "matrix-js-sdk";
import { get, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { ChatUser } from "../ChatConnection";
import { gameManager } from "../../../Phaser/Game/GameManager";

export const chatUserFactory: (matrixChatUser: User, matrixClient: MatrixClient) => ChatUser = (
    matrixChatUser,
    matrixClient
) => {
    const chatUser: ChatUser = {
        id: "",
        username: "",
        roomName: undefined,
        playUri: undefined,
        avatarUrl: null,
        color: undefined,
        spaceId: undefined,
        availabilityStatus: writable(AvailabilityStatus.ONLINE),
    };
    chatUser.id = matrixChatUser.userId;
    chatUser.username = getWokaNameFromMatrixID(matrixChatUser.userId) ?? matrixChatUser.displayName;
    chatUser.avatarUrl =  matrixClient.mxcUrlToHttp(matrixChatUser.avatarUrl ?? "", 48, 48);

    //chatUser.avatarUrl = matrixChatUser.avatarUrl ?? null;
    chatUser.availabilityStatus.set(mapMatrixPresenceToAvailabilityStatus(matrixChatUser.presence));
    return chatUser;
};

function mapMatrixPresenceToAvailabilityStatus(presence: string = SetPresence.Offline): AvailabilityStatus {
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

function getWokaNameFromMatrixID(matrixID : string) : string | undefined {
    const connectedUsers = get(gameManager.getCurrentGameScene().chatConnection.connectedUsers);
    const userDisconnected= get(gameManager.getCurrentGameScene().chatConnection.userDisconnected);

    console.log('getWokaNameFromMatrixID',userDisconnected.get(matrixID),Array.from(connectedUsers.values()).find((user)=> user.id === matrixID));

    if(userDisconnected.has(matrixID)){
        return userDisconnected.get(matrixID)?.username
    }

    return Array.from(connectedUsers.values()).find((user)=> user.id === matrixID)?.username; 
   
}


function getWokaAvatarURLFromMatrixID(matrixID : string) : string | undefined | null {
    const connectedUsers = get(gameManager.getCurrentGameScene().chatConnection.connectedUsers);
    const userDisconnected= get(gameManager.getCurrentGameScene().chatConnection.userDisconnected);


    return Array.from(connectedUsers.values()).find((user)=> user.id === matrixID)?.avatarUrl ?? userDisconnected.get(matrixID)?.avatarUrl ; 
   
}