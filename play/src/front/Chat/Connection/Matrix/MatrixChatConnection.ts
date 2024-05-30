import { derived, get, Readable, writable, Writable } from "svelte/store";
import {
    ClientEvent,
    EventType,
    ICreateRoomOpts,
    ICreateRoomStateEvent,
    IRoomDirectoryOptions,
    MatrixClient,
    MatrixEvent,
    PendingEventOrdering,
    Room,
    RoomEvent,
    SyncState,
    Visibility,
} from "matrix-js-sdk";
import { MapStore } from "@workadventure/store-utils";
import {
    AvailabilityStatus,
    ChatMember,
    ChatMemberData,
    ChatMembersAnswer,
    PartialSpaceUser,
} from "@workadventure/messages";
import { KnownMembership } from "matrix-js-sdk/lib/@types/membership";
import { KeyBackupInfo } from "matrix-js-sdk/lib/crypto-api/keybackup";
import {
    ChatConnectionInterface,
    ChatRoom,
    ChatUser,
    Connection,
    ConnectionStatus,
    CreateRoomOptions,
} from "../ChatConnection";
import { SpaceUserExtended } from "../../../Space/SpaceFilter/SpaceFilter";
import { selectedRoom } from "../../Stores/ChatStore";
import { MatrixClientWrapperInterface } from "./MatrixClientWrapper";
import { MatrixChatRoom } from "./MatrixChatRoom";
import { chatUserFactory } from "./MatrixChatUser";
import CreateRecoveryKeyDialog from "./CreateRecoveryKeyDialog.svelte";
import { openModal } from "svelte-modals";
import { GeneratedSecretStorageKey } from "matrix-js-sdk/lib/crypto-api";
import InteractiveAuthDialog from "./InteractiveAuthDialog.svelte";

export const defaultWoka =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";
export const defaultColor = "#626262";

type UUID = string;
type chatId = string;

export enum INTERACTIVE_AUTH_PHASE {
    PRE_AUTH = 1,
    POST_AUTH,
}

export class MatrixChatConnection implements ChatConnectionInterface {
    private client!: MatrixClient;
    private readonly roomList: MapStore<string, ChatRoom>;
    private initializingEncryption = false;
    connectionStatus: Writable<ConnectionStatus>;
    directRooms: Readable<ChatRoom[]>;
    invitations: Readable<ChatRoom[]>;
    rooms: Readable<ChatRoom[]>;
    userConnected: MapStore<UUID, ChatUser> = new MapStore<UUID, ChatUser>();
    userDisconnected: MapStore<chatId, ChatUser> = new MapStore<chatId, ChatUser>();

    constructor(private connection: Connection, private matrixClientWrapper: MatrixClientWrapperInterface) {
        this.connectionStatus = writable("CONNECTING");
        this.roomList = new MapStore<string, MatrixChatRoom>();

        this.directRooms = derived(this.roomList, (roomList) => {
            return Array.from(roomList.values()).filter(
                (room) => room.myMembership === KnownMembership.Join && room.type === "direct"
            );
        });
        this.invitations = derived(this.roomList, (roomList) => {
            return Array.from(roomList.values()).filter((room) => room.myMembership === KnownMembership.Invite);
        });
        this.rooms = derived(this.roomList, (roomList) => {
            return Array.from(roomList.values()).filter(
                (room) => room.myMembership === KnownMembership.Join && room.type === "multiple"
            );
        });

        (async () => {
            this.client = await matrixClientWrapper.initMatrixClient();
            await this.startMatrixClient();
        })().catch((error) => {
            console.error(error);
        });
    }

    async startMatrixClient() {
        this.client.on(ClientEvent.Sync, (state) => {
            switch (state) {
                case SyncState.Prepared:
                    this.connectionStatus.set("ONLINE");
                    this.initUserList();
                    break;
                case SyncState.Error:
                    this.connectionStatus.set("ON_ERROR");
                    break;
                case SyncState.Reconnecting:
                    this.connectionStatus.set("CONNECTING");
                    break;
                case SyncState.Stopped:
                    this.connectionStatus.set("OFFLINE");
                    break;
            }
        });
        this.client.on(ClientEvent.Room, this.onClientEventRoom.bind(this));
        this.client.on(ClientEvent.DeleteRoom, this.onClientEventDeleteRoom.bind(this));
        this.client.on(RoomEvent.MyMembership, this.onRoomEventMembership.bind(this));

        //TODO find a fix for that
        //this.client.on(RoomEvent.Timeline, this.onRoomEventTimeline.bind(this));

        await this.client.store.startup();
        await this.client.initRustCrypto();
        await this.client.startClient({
            threadSupport: false,
            //Detached to prevent using listener on localIdReplaced for each event
            pendingEventOrdering: PendingEventOrdering.Detached,
        });
        await this.initClientCryptoConfiguration();
    }

    private async initClientCryptoConfiguration() {
        const crypto = this.client.getCrypto();
        if (crypto === undefined) {
            console.error("E2EE is not available for this client");
            return;
        }

        const roomEncryptionEnablePromises: Promise<boolean>[] = [];

        this.client.getRooms().forEach((room) => {
            roomEncryptionEnablePromises.push(crypto.isEncryptionEnabledInRoom(room.roomId));
        });

        const encryptionStatus: boolean[] = await Promise.all(roomEncryptionEnablePromises);

        if (encryptionStatus.some((status) => status)) {
            console.warn("skip E2EE bootstrapping", { encryptionStatus });
            return;
        }

        const keyBackupInfo = await this.client.getKeyBackupVersion();
        const isCrossSigningReady = await crypto.isCrossSigningReady();

        try {
            if (!isCrossSigningReady) {
                await crypto.bootstrapCrossSigning({
                    authUploadDeviceSigningKeys: async (makeRequest) => {
                        const finished = await new Promise<boolean>((resolve) => {
                            openModal(InteractiveAuthDialog, {
                                matrixClient: this.client,
                                onFinished: (finished: boolean) => resolve(finished),
                                makeRequest,
                            });
                        });
                        if (!finished) {
                            throw new Error("Cross-signing key upload auth canceled");
                        }
                    },
                });

                await crypto.bootstrapSecretStorage({
                    createSecretStorageKey: async () => {
                        const generatedKey = await new Promise<GeneratedSecretStorageKey | null>((resolve, reject) => {
                            openModal(CreateRecoveryKeyDialog, {
                                crypto,
                                processCallback: (generatedKey: GeneratedSecretStorageKey | null) => {
                                    if (generatedKey === undefined) {
                                        reject(new Error("no generated secret storage key"));
                                    }
                                    resolve(generatedKey);
                                },
                            });
                        });
                        if (generatedKey === null) {
                            throw new Error("createSecretStorageKey : no generated secret storage key");
                        }
                        return Promise.resolve(generatedKey);
                    },
                    setupNewKeyBackup: keyBackupInfo === null,
                    keyBackupInfo: keyBackupInfo ?? undefined,
                });
            }
            await this.restoreBackupMessages(keyBackupInfo);
            this.initializingEncryption = true;
        } catch (error) {
            console.error("initClientCryptoConfiguration : ", error);
        }
    }

    private async restoreBackupMessages(keyBackupInfo: KeyBackupInfo | null) {
        const has4s = await this.client.secretStorage.hasKey();
        const backupRestored = has4s ? await this.client.isKeyBackupKeyStored() : null;

        if (keyBackupInfo) {
            console.debug("keyBackupInfo : ", keyBackupInfo);
            const restoredWithCachedKey = await this.restoreWithCachedKey(keyBackupInfo);
            if (!restoredWithCachedKey && backupRestored) {
                await this.restoreWithSecretStorage(keyBackupInfo);
            }
        }
    }

    private async restoreWithCachedKey(keyBackupInfo: KeyBackupInfo) {
        try {
            await this.client.restoreKeyBackupWithCache(undefined, undefined, keyBackupInfo);
            return true;
        } catch (error) {
            console.error("Unable to restoreKeyBackupWithCache : ", error);
            return false;
        }
    }

    private async restoreWithSecretStorage(keyBackupInfo: KeyBackupInfo) {
        try {
            await this.client.restoreKeyBackupWithSecretStorage(keyBackupInfo);
            return true;
        } catch (error) {
            console.error("Unable to restoreKeyBackupWithCache : ", error);
            return false;
        }
    }

    private onClientEventRoom(room: Room) {
        const { roomId } = room;
        const existingMatrixChatRoom = this.roomList.get(roomId);

        if (existingMatrixChatRoom !== undefined) {
            return;
        }

        const matrixRoom = new MatrixChatRoom(room);
        this.roomList.set(matrixRoom.id, matrixRoom);

        if (this.initializingEncryption || !matrixRoom.isEncrypted) {
            return;
        }

        async () => {
            await this.initClientCryptoConfiguration();
        };
    }

    private onClientEventDeleteRoom(roomId: string) {
        this.roomList.delete(roomId);
    }

    private onRoomEventMembership(room: Room, membership: string, prevMembership: string | undefined) {
        const { roomId } = room;
        const existingMatrixChatRoom = this.roomList.has(roomId);
        if (membership !== prevMembership && existingMatrixChatRoom) {
            if (membership === KnownMembership.Join) {
                this.roomList.set(roomId, new MatrixChatRoom(room));
                return;
            }
            if (membership === KnownMembership.Leave || membership === KnownMembership.Ban) {
                this.roomList.delete(roomId);
                const currentRoom = get(selectedRoom)?.id;
                if (currentRoom && currentRoom === roomId) selectedRoom.set(undefined);
                return;
            }
            if (membership === KnownMembership.Invite) {
                const inviter = room.getDMInviter();
                const newRoom = new MatrixChatRoom(room);
                if (
                    inviter &&
                    (this.userDisconnected.has(inviter) ||
                        Array.from(this.userConnected.values()).some((user: ChatUser) => user.id === inviter))
                ) {
                    this.roomList.set(roomId, newRoom);
                    newRoom.joinRoom();
                }
                return;
            }
        }
    }

    private onRoomEventTimeline(event: MatrixEvent, room: Room | undefined) {
        const roomId = room?.roomId;
        if (event.getType() === "m.room.member" && roomId) this.roomList.set(roomId, new MatrixChatRoom(room));
    }

    private initUserList(): void {
        this.client
            .getUsers()
            .filter((user) => user.userId !== this.client.getUserId())
            .forEach((user) => {
                user.avatarUrl = this.client.mxcUrlToHttp(user.avatarUrl ?? "", 48, 48) ?? defaultWoka;
                this.userDisconnected.set(user.userId, chatUserFactory(user, this.client));
            });

        this.getWorldChatMembers().then((members) => {
            members.forEach((member) => {
                if (member.chatId) {
                    this.userDisconnected.set(member.chatId, {
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
                }
            });
        });
    }

    updateUserFromSpace(user: PartialSpaceUser): void {
        const connectedUserToUpdate: ChatUser | undefined = Array.from(this.userConnected.values()).filter(
            ({ spaceId }) => spaceId === user.id
        )[0];

        if (!connectedUserToUpdate) return;

        if (user.availabilityStatus && user.availabilityStatus !== 0)
            connectedUserToUpdate.availabilityStatus.set(user.availabilityStatus);
        if (connectedUserToUpdate.uuid)
            this.userConnected.set(connectedUserToUpdate.uuid, {
                id: connectedUserToUpdate.id,
                uuid: connectedUserToUpdate.uuid,
                avatarUrl: connectedUserToUpdate.avatarUrl,
                availabilityStatus: connectedUserToUpdate.availabilityStatus,
                roomName: user.roomName ?? connectedUserToUpdate.roomName,
                playUri: user.playUri ?? connectedUserToUpdate.playUri,
                username: user.name ?? connectedUserToUpdate.username,
                isAdmin:
                    user.tags && user.tags.length > 0 ? user.tags.includes("admin") : connectedUserToUpdate.isAdmin,
                isMember:
                    user.tags && user.tags.length > 0 ? user.tags.includes("member") : connectedUserToUpdate.isMember,
                visitCardUrl: user.visitCardUrl ?? connectedUserToUpdate.visitCardUrl,
                color: user.color || connectedUserToUpdate.color,
                spaceId: connectedUserToUpdate.spaceId,
            });
    }

    addUserFromSpace(user: SpaceUserExtended): void {
        if (!user.chatID) return;
        //TODO : Try to find why pusher send us availabilityStatus = 0
        if (user.availabilityStatus === 0) user.availabilityStatus = AvailabilityStatus.ONLINE;
        let updatedUser = {
            uuid: user.uuid,
            id: user.chatID,
            avatarUrl: user.getWokaBase64 ?? defaultWoka,
            availabilityStatus: writable(user.availabilityStatus),
            roomName: user.roomName,
            playUri: user.playUri,
            username: user.name,
            isAdmin: user.tags.includes("admin"),
            isMember: user.tags.includes("member"),
            visitCardUrl: user.visitCardUrl,
            color: user.color ?? defaultColor,
            spaceId: user.id,
        };

        const actualUser = this.userConnected.get(user.uuid);
        if (actualUser) {
            actualUser.availabilityStatus.set(user.availabilityStatus);
            updatedUser = {
                uuid: user.uuid,
                id: user.chatID,
                avatarUrl: user.getWokaBase64 ?? defaultWoka,
                availabilityStatus: actualUser.availabilityStatus,
                roomName: user.roomName,
                playUri: user.playUri,
                username: user.name,
                isAdmin: user.tags.includes("admin"),
                isMember: user.tags.includes("member"),
                visitCardUrl: user.visitCardUrl,
                color: user.color ?? defaultColor,
                spaceId: user.id,
            };
        }

        this.userConnected.set(user.uuid, updatedUser);
    }

    disconnectSpaceUser(userId: number): void {
        const { uuid } = Array.from(this.userConnected.values()).filter(({ spaceId }) => spaceId === userId)[0];
        if (uuid) this.userConnected.delete(uuid);
    }

    async getWorldChatMembers(searchText?: string): Promise<ChatMemberData[]> {
        const { members } = await this.connection.queryChatMembers(searchText ?? "");
        return members;
    }

    sendBan(uuid: string, username: string): void {
        if (this.connection.emitBanPlayerMessage) this.connection.emitBanPlayerMessage(uuid, username);
    }

    //TODO createOptions only on matrix size
    async createRoom(roomOptions?: CreateRoomOptions): Promise<{
        room_id: string;
    }> {
        if (roomOptions === undefined) {
            return Promise.reject("CreateRoomOptions is empty");
        }
        return await this.client.createRoom(this.mapCreateRoomOptionsToMatrixCreateRoomOptions(roomOptions));
    }

    private mapCreateRoomOptionsToMatrixCreateRoomOptions(roomOptions: CreateRoomOptions): ICreateRoomOpts {
        return {
            name: roomOptions.name,
            visibility: roomOptions.visibility as Visibility | undefined,
            room_alias_name: roomOptions.name,
            invite: roomOptions.invite?.map((invitation) => invitation.value) ?? [],
            is_direct: roomOptions.is_direct,
            initial_state: this.computeInitialState(roomOptions),
        };
    }

    private computeInitialState(roomOptions: CreateRoomOptions) {
        const { encrypt, historyVisibility } = roomOptions;
        const initial_state: ICreateRoomStateEvent[] = [];
        if (encrypt !== undefined) {
            initial_state.push({ type: EventType.RoomEncryption, content: { algorithm: "m.megolm.v1.aes-sha2" } });
        }
        if (historyVisibility !== undefined) {
            initial_state.push({
                type: EventType.RoomHistoryVisibility,
                content: { history_visibility: roomOptions?.historyVisibility },
            });
        }

        return initial_state;
    }

    async createDirectRoom(userToInvite: string): Promise<ChatRoom | undefined> {
        const existingDirectRoom = this.getDirectRoomFor(userToInvite);

        if (existingDirectRoom) return existingDirectRoom;

        const { room_id } = await this.createRoom({
            //TODO not clean code
            invite: [{ value: userToInvite, label: userToInvite }],
            is_direct: true,
            preset: "private_chat",
            preset: "trusted_private_chat",
            visibility: "private",
        });
        await this.addDMRoomInAccountData(userToInvite, room_id);

        //Wait Sync Event before use/update roomList otherwise room not exist in the client
        await new Promise<void>((resolve, _) => {
            this.client.once(ClientEvent.Sync, (state) => {
                if (state === SyncState.Syncing) {
                    resolve();
                }
            });
        });

        const room = this.client.getRoom(room_id);
        if (!room) return;
        const newRoom = new MatrixChatRoom(room);
        this.roomList.set(room_id, newRoom);
        return newRoom;
    }

    getDirectRoomFor(userID: string): ChatRoom | undefined {
        const directRooms = Array.from(this.roomList)
            .filter(([_, room]) => {
                return (
                    room.type === "direct" &&
                    room.membersId.some((memberId) => memberId === userID && room.membersId.length === 2)
                );
            })
            .map(([_, room]) => room);

        if (directRooms.length > 0) return directRooms[0];

        return undefined;
    }

    searchUsers(searchText: string): Promise<void> {
        return new Promise((res, rej) => {
            this.connection
                .queryChatMembers(searchText)
                .then(({ members }: ChatMembersAnswer) => {
                    members.forEach((member: ChatMember) => {
                        if (!member.chatId || this.userDisconnected.has(member.chatId)) return;
                        this.userDisconnected.set(member.chatId, {
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
                    });
                    res();
                })
                .catch((error) => rej(error));
        });
    }

    async searchChatUsers(searchText: string) {
        try {
            const searchUserResponse = await this.client.searchUserDirectory({ term: searchText, limit: 20 });
            return searchUserResponse.results.map((user) => ({ id: user.user_id, name: user.display_name }));
        } catch (error) {
            console.error("Unable to search matrix chat user with searchText: ", searchText, error);
        }
        return;
    }

    async searchAccesibleRooms(searchText = ""): Promise<
        {
            id: string;
            name: string | undefined;
        }[]
    > {
        return new Promise((res, rej) => {
            const searchOption: IRoomDirectoryOptions = {
                include_all_networks: true,
                filter: {
                    generic_search_term: searchText,
                },
            };
            this.client
                .publicRooms(searchOption)
                .then(({ chunk }) => {
                    const publicRoomsChunkRoom = chunk
                        .filter(({ room_id }) => !this.roomList.has(room_id))
                        .map((chunkRoom) => {
                            return {
                                id: chunkRoom.room_id,
                                name: chunkRoom.name,
                            };
                        });
                    res(publicRoomsChunkRoom);
                })
                .catch((error) => {
                    rej(error);
                });
        });
    }

    async joinRoom(roomId: string): Promise<ChatRoom> {
        return new Promise((res, rej) => {
            this.client
                .joinRoom(roomId)
                .then(async (_) => {
                    //Wait Sync Event before use/update roomList otherwise room not exist in the client
                    await new Promise<void>((resolve, _) => {
                        this.client.once(ClientEvent.Sync, (state) => {
                            if (state === SyncState.Syncing) {
                                resolve();
                            }
                        });
                    });

                    const roomAfterSync = this.client.getRoom(roomId);
                    if (!roomAfterSync) return;
                    const dmInviterId = roomAfterSync.getDMInviter();
                    if (dmInviterId) {
                        await this.addDMRoomInAccountData(dmInviterId, roomId);
                    }

                    const matrixRoom = new MatrixChatRoom(roomAfterSync);
                    this.roomList.set(roomId, matrixRoom);
                    res(matrixRoom);
                })
                .catch((error) => {
                    console.error("Unable to join", error);
                    rej(error);
                });
        });
    }

    private async addDMRoomInAccountData(userId: string, roomId: string) {
        const directMap: Record<string, string[]> = this.client.getAccountData("m.direct")?.getContent() || {};
        directMap[userId] = [...(directMap[userId] || []), roomId];
        await this.client.setAccountData("m.direct", directMap);
        console.log("addDMRoomInAccountData : ", directMap);
    }

    async destroy(): Promise<void> {
        await this.client.logout(true);
    }
}