import { Readable, Writable, get, writable } from "svelte/store";
import { AvailabilityStatus, ChatMember, ChatMembersAnswer, PartialSpaceUser } from "@workadventure/messages";
import {
    ChatConnectionInterface,
    ChatRoom,
    ChatType,
    ChatUser,
    ConnectionStatus,
    CreateRoomOptions,
} from "../ChatConnection";
import { SpaceUserExtended } from "../../../Space/SpaceFilter/SpaceFilter";
import { RoomConnection } from "../../../Connection/RoomConnection";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { ProximityChatRoom } from "./ProximityChatRoom";

export const defaultWoka =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";
export const defaultColor = "#626262";
export class ProximityChatConnection implements ChatConnectionInterface {
    connectionStatus: Readable<ConnectionStatus> = writable("ONLINE");
    userConnected: Writable<Map<number, ChatUser>> = writable(new Map());
    userDisconnected = writable(new Map());
    directRooms = writable([]);
    rooms: Writable<ChatRoom[]> = writable([]);
    invitations = writable([]);
    isEncryptionRequiredAndNotSet: Readable<boolean> = writable(false);
    isGuest: Readable<boolean> = writable(true);
    type: ChatType = "PROXIMITY";

    public spaceId: Writable<string | undefined> = writable(undefined);
    public spaceName: Writable<string | undefined> = writable(undefined);

    constructor(private _roomConnection: RoomConnection, private _userId: number, private _userUuid: string) {
        this.rooms.update((rooms) => {
            rooms.push(new ProximityChatRoom(this, this._userId, this._userUuid));
            return rooms;
        });

        this.initUserList();
    }

    private initUserList(): void {
        this.getWorldChatMembers()
            .then((members) => {
                members.forEach((member) => {
                    if (member.chatId) {
                        this.userDisconnected.update((users) => {
                            users.set(member.chatId, {
                                availabilityStatus: writable(AvailabilityStatus.UNCHANGED),
                                avatarUrl: defaultWoka,
                                id: member.chatId,
                                roomName: undefined,
                                playUri: undefined,
                                username: member.wokaName,
                                isAdmin: member.tags.includes("admin"),
                                isMember: member.tags.includes("member"),
                                uuid: undefined,
                                color: defaultColor,
                                spaceId: undefined,
                            });

                            return users;
                        });
                    }
                });
            })
            .catch((error) => console.error(error));
    }

    async getWorldChatMembers(searchText?: string): Promise<ChatMember[]> {
        const { members } = await this._roomConnection.queryChatMembers(searchText ?? "");
        return members;
    }

    addUserFromSpace(user: SpaceUserExtended): void {
        // if the user isn't already in the list, don't add it

        let avataUrl = gameManager.getCurrentGameScene().CurrentPlayer.pictureStore;
        if (user.id !== this._userId) {
            avataUrl = gameManager
                .getCurrentGameScene()
                .MapPlayersByKey.getNestedStore(user.id, (item) => item.pictureStore);
        }

        if (user.availabilityStatus === 0) user.availabilityStatus = AvailabilityStatus.ONLINE;

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

        this.userConnected.update((users) => {
            users.set(user.id, chatUser);
            return users;
        });
    }
    updateUserFromSpace(user: PartialSpaceUser): void {
        // if the user isn't already in the list, don't add it
        if (get(this.userConnected).has(user.id) == false) {
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
        this.userConnected.update((users) => {
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
        if (this._roomConnection.emitBanPlayerMessage) this._roomConnection.emitBanPlayerMessage(uuid, username);
    }
    createRoom(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        throw new Error("Method not implemented.");
    }
    createDirectRoom(userChatId: string): Promise<ChatRoom | undefined> {
        return Promise.resolve(undefined);
    }
    getDirectRoomFor(uuserChatId: string): ChatRoom | undefined {
        return undefined;
    }
    searchUsers(searchText: string): Promise<void> {
        return new Promise((res, rej) => {
            this._roomConnection
                .queryChatMembers(searchText)
                .then(({ members }: ChatMembersAnswer) => {
                    members.forEach((member: ChatMember) => {
                        if (!member.chatId || get(this.userDisconnected).has(member.chatId)) return;
                        this.userDisconnected.update((actualUserDisconnected) => {
                            actualUserDisconnected.set(member.chatId, {
                                availabilityStatus: writable(AvailabilityStatus.UNCHANGED),
                                avatarUrl: defaultWoka,
                                id: member.chatId,
                                roomName: undefined,
                                playUri: undefined,
                                username: member.wokaName,
                                isAdmin: member.tags.includes("admin"),
                                isMember: member.tags.includes("member"),
                                uuid: undefined,
                                color: defaultColor,
                                spaceId: undefined,
                            });
                            return actualUserDisconnected;
                        });
                    });
                    res();
                })
                .catch((error) => rej(error));
        });
    }
    searchAccessibleRooms(searchText: string): Promise<{ id: string; name: string | undefined }[]> {
        return Promise.resolve([]);
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
    }

    // method to get room connection
    get roomConnection(): RoomConnection {
        return this._roomConnection;
    }
}
