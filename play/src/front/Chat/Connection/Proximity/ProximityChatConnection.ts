import { Readable, Writable, writable } from "svelte/store";
import { AvailabilityStatus, PartialSpaceUser } from "@workadventure/messages";
import { ChatConnectionInterface, ChatRoom, ChatUser, ConnectionStatus, CreateRoomOptions } from "../ChatConnection";
import { SpaceUserExtended } from "../../../Space/SpaceFilter/SpaceFilter";
import { RoomConnection } from "../../../Connection/RoomConnection";
import { ProximityChatRoom } from "./ProximityChatRoom";

export class ProximityChatConnection implements ChatConnectionInterface {
    connectionStatus: Readable<ConnectionStatus> = writable("ONLINE");
    userConnected = writable(new Map());
    userDisconnected = writable(new Map());
    directRooms = writable([]);
    rooms: Writable<ChatRoom[]> = writable([]);
    invitations = writable([]);
    isEncryptionRequiredAndNotSet: Readable<boolean> = writable(false);
    isGuest: Readable<boolean> = writable(false);

    public spaceId: Readable<number | undefined>;
    public spaceName: Readable<string | undefined>;

    constructor(
        private _roomConnection: RoomConnection,
        private _userUuid: string,
        private _username: string,
        private _avatarUrl: string,
        private _roomName: string,
        private _playUri: string,
        private _visitCardUrl?: string,

        _spaceId?: number,
        _spaceName?: string
    ) {
        // Create current user for the proximity chat
        const user: ChatUser = {
            id: this._userUuid,
            uuid: this._userUuid,
            username: this._username,
            avatarUrl: this._avatarUrl,
            roomName: this._roomName,
            spaceId: _spaceId,
            playUri: this._playUri,
            isAdmin: false,
            isMember: true,
            visitCardUrl: this._visitCardUrl,
            availabilityStatus: writable(AvailabilityStatus.ONLINE),
            color: undefined,
        };
        this.spaceId = writable(_spaceId);
        this.spaceName = writable(_spaceName);

        // Add the proximity chat room to the list of rooms
        this.rooms.update((rooms) => {
            rooms.push(new ProximityChatRoom(this, user));
            return rooms;
        });
    }

    addUserFromSpace(user: SpaceUserExtended): void {
        this.userConnected.update((users) => {
            users.set(user.id, user);
            return users;
        });
    }
    updateUserFromSpace(user: PartialSpaceUser): void {
        this.userConnected.update((users) => {
            users.set(user.id, user);
            return users;
        });
    }
    disconnectSpaceUser(userId: number): void {
        this.userDisconnected.update((users) => {
            users.delete(userId);
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

    // method to get room connection
    get roomConnection(): RoomConnection {
        return this._roomConnection;
    }
}
