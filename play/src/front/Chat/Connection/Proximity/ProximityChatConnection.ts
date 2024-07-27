import { Readable, Writable, get, writable } from "svelte/store";
import { PartialSpaceUser } from "@workadventure/messages";
import { ChatConnectionInterface, ChatRoom, ChatUser, ConnectionStatus, CreateRoomOptions } from "../ChatConnection";
import { SpaceUserExtended } from "../../../Space/SpaceFilter/SpaceFilter";
import { RoomConnection } from "../../../Connection/RoomConnection";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { Space } from "../../../Space/Space";
import { ProximityChatRoom } from "./ProximityChatRoom";

export class ProximityChatConnection implements ChatConnectionInterface {
    connectionStatus: Readable<ConnectionStatus> = writable("ONLINE");
    connectedUsers: Writable<Map<number, ChatUser>> = writable(new Map());
    userDisconnected = writable(new Map());
    directRooms = writable([]);
    rooms: Writable<ChatRoom[]> = writable([]);
    invitations = writable([]);
    isEncryptionRequiredAndNotSet: Readable<boolean> = writable(false);
    isGuest: Readable<boolean> = writable(false);

    public spaceId: Writable<string | undefined> = writable(undefined);
    public spaceName: Writable<string | undefined> = writable(undefined);

    private currentSpace: Space | undefined;

    constructor(private _roomConnection: RoomConnection, private _userId: number, private _userUuid: string) {
        this.rooms.update((rooms) => {
            rooms.push(new ProximityChatRoom(this, this._userId, this._userUuid));
            return rooms;
        });
    }

    addUserFromSpace(user: SpaceUserExtended): void {
        // if the user isn't already in the list, don't add it
        if (get(this.connectedUsers).has(user.id) == false) {
            return;
        }

        let avataUrl = gameManager.getCurrentGameScene().CurrentPlayer.pictureStore;
        if (user.id !== this._userId) {
            avataUrl = gameManager
                .getCurrentGameScene()
                .MapPlayersByKey.getNestedStore(user.id, (item) => item.pictureStore);
        }
        const chatUser = {
            id: user.id.toString(),
            uuid: user.uuid,
            availabilityStatus: writable(user.availabilityStatus),
            username: user.name,
            roomName: user.roomName,
            playUri: user.playUri,
            color: user.color,
            avatarUrl: get(avataUrl),
        } as ChatUser;

        this.connectedUsers.update((users) => {
            users.set(user.id, chatUser);
            return users;
        });
    }
    updateUserFromSpace(user: PartialSpaceUser): void {
        // if the user isn't already in the list, don't add it
        if (get(this.connectedUsers).has(user.id) == false) {
            return;
        }

        let avataUrl = gameManager.getCurrentGameScene().CurrentPlayer.pictureStore;
        if (user.id !== this._userId) {
            avataUrl = gameManager
                .getCurrentGameScene()
                .MapPlayersByKey.getNestedStore(user.id, (item) => item.pictureStore);
        }
        const chatUser = {
            id: user.id.toString(),
            uuid: user.uuid,
            availabilityStatus: writable(user.availabilityStatus),
            username: user.name,
            roomName: user.roomName,
            playUri: user.playUri,
            color: user.color,
            avatarUrl: get(avataUrl),
        } as ChatUser;
        this.connectedUsers.update((users) => {
            users.set(user.id, chatUser);
            return users;
        });
    }
    disconnectSpaceUser(userId: number): void {
        this.userDisconnected.update((users) => {
            users.delete(userId.toString());
            return users;
        });
    }

    sendBan(uuid: string, username: string): void {
        throw new Error("Method not implemented.");
    }
    createRoom(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        throw new Error("Method not implemented.");
    }
    createDirectRoom(userChatId: string): Promise<ChatRoom | undefined> {
        throw new Error("Method not implemented.");
    }
    getDirectRoomFor(uuserChatId: string): ChatRoom | undefined {
        throw new Error("Method not implemented.");
    }
    searchUsers(searchText: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    searchAccessibleRooms(searchText: string): Promise<{ id: string; name: string | undefined }[]> {
        throw new Error("Method not implemented.");
    }
    joinRoom(roomId: string): Promise<ChatRoom | undefined> {
        throw new Error("Method not implemented.");
    }
    destroy(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    searchChatUsers(searchText: string): Promise<{ id: string; name: string | undefined }[] | undefined> {
        throw new Error("Method not implemented.");
    }
    initEndToEndEncryption(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    joinSpace(spaceId: string, spaceName: string): void {
        this.spaceId.set(spaceId);
        this.spaceName.set(spaceName);

        this.currentSpace = new Space(spaceName, new Map(), undefined, undefined);
    }

    // method to get room connection
    get roomConnection(): RoomConnection {
        return this._roomConnection;
    }
}
