import { derived, get, Readable, writable, Writable } from "svelte/store";
import {
    ClientEvent,
    Direction,
    EventType,
    ICreateRoomOpts,
    ICreateRoomStateEvent,
    IRoomDirectoryOptions,
    MatrixClient,
    MatrixError,
    MatrixEvent,
    PendingEventOrdering,
    Room,
    RoomEvent,
    SyncState,
    Visibility,
} from "matrix-js-sdk";
import * as Sentry from "@sentry/svelte";
import { MapStore } from "@workadventure/store-utils";
import { KnownMembership } from "matrix-js-sdk/lib/@types/membership";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { ChatConnectionInterface, ChatRoom, Connection, ConnectionStatus, CreateRoomOptions } from "../ChatConnection";
import { selectedRoom } from "../../Stores/ChatStore";
import { MatrixChatRoom } from "./MatrixChatRoom";
import { MatrixSecurity, matrixSecurity as defaultMatrixSecurity } from "./MatrixSecurity";
import { MatrixRoomFolder } from "./MatrixRoomFolder";

export const defaultWoka =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";
export const defaultColor = "#626262";

export enum INTERACTIVE_AUTH_PHASE {
    PRE_AUTH = 1,
    POST_AUTH,
}
export class MatrixChatConnection implements ChatConnectionInterface {
    private readonly roomList: MapStore<string, ChatRoom>;
    private client!: MatrixClient;
    connectionStatus: Writable<ConnectionStatus>;
    directRooms: Readable<ChatRoom[]>;
    invitations: Readable<ChatRoom[]>;
    rooms: Readable<ChatRoom[]>;
    isEncryptionRequiredAndNotSet: Writable<boolean>;
    isGuest: Writable<boolean> = writable(true);
    hasUnreadMessages: Readable<boolean>;
    roomFolders: Writable<MatrixRoomFolder[]> = writable([]);

    constructor(
        private connection: Connection,
        clientPromise: Promise<MatrixClient>,
        private matrixSecurity: MatrixSecurity = defaultMatrixSecurity
    ) {
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

        this.hasUnreadMessages = derived(
            this.roomList,
            ($roomList, set) => {
                // Create a listener for each `hasUnreadMessages` store
                const unsubscribes = Array.from($roomList.values()).map((room) =>
                    room.hasUnreadMessages.subscribe(() => {
                        set(Array.from($roomList.values()).some((someRoom) => get(someRoom.hasUnreadMessages)));
                    })
                );

                // Cleanup function
                return () => unsubscribes.forEach((unsub) => unsub());
            },
            false
        );

        this.isEncryptionRequiredAndNotSet = this.matrixSecurity.isEncryptionRequiredAndNotSet;

        (async () => {
            this.client = await clientPromise;
            await this.startMatrixClient();
            this.isGuest.set(this.client.isGuest());
        })().catch((error) => {
            console.error(error);
        });
    }

    async startMatrixClient() {
        this.client.on(ClientEvent.Sync, (state) => {
            switch (state) {
                case SyncState.Prepared:
                    this.connectionStatus.set("ONLINE");
                    this.connection.emitPlayerChatID(this.client.getSafeUserId());
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
        this.client.on("RoomState.events", this.onRoomStateEvent.bind(this));

        await this.client.store.startup();
        await this.client.initRustCrypto();
        await this.client.startClient({
            threadSupport: false,
            //Detached to prevent using listener on localIdReplaced for each event
            pendingEventOrdering: PendingEventOrdering.Detached,
        });
    }
    private getParentRoomID(room: Room): string[] {
        return (room.getLiveTimeline().getState(Direction.Forward)?.getStateEvents("m.space.parent") || []).reduce(
            (acc, currentMatrixEvent) => {
                const parentID = currentMatrixEvent.getStateKey();
                if (parentID) acc.push(parentID);
                return acc;
            },
            [] as string[]
        );
    }
    private onRoomStateEvent(event: MatrixEvent): void {
        const eventType = event.getType();

        if (eventType !== "m.space.child") return;

        const roomID = event.getStateKey();
        if (!roomID) return;

        const room = this.client.getRoom(roomID);
        if (!room) return;

        this.removeFromRootRoomList(roomID);
        const parentID = event.getRoomId();
        if (!parentID) return;

        const parentRoom = this.client.getRoom(parentID);
        if (!parentRoom) return;

        this.moveRoomToParentFolder(room, parentID);
    }
    private onClientEventRoom(room: Room) {
        this.manageRoomOrFolder(room);
    }
    private removeFromRootRoomList(roomID: string): boolean {
        if (this.roomList.has(roomID)) {
            this.roomList.delete(roomID);
            return true;
        } else {
            return false;
        }
    }
    private moveRoomToParentFolder(room: Room, parentID: string): void {
        const roomFolders = get(this.roomFolders);
        const isSpaceRoom = room.isSpaceRoom();
        for (const folder of roomFolders) {
            if (folder.id === parentID) {
                if (isSpaceRoom) {
                    this.addToFolder<MatrixRoomFolder>(folder.folders, new MatrixRoomFolder(room));
                } else {
                    this.addToFolder<MatrixChatRoom>(folder.rooms, new MatrixChatRoom(room));
                }
                break;
            }

            const node = folder.getNode(parentID);
            if (node && node instanceof MatrixRoomFolder) {
                if (isSpaceRoom) {
                    this.addToFolder<MatrixRoomFolder>(node.folders, new MatrixRoomFolder(room));
                } else {
                    this.addToFolder<MatrixChatRoom>(node.rooms, new MatrixChatRoom(room));
                }
                break;
            }
        }
    }

    private addToFolder<T extends MatrixRoomFolder | MatrixChatRoom>(folder: Writable<T[]>, room: T): void {
        folder.update((folders) => {
            if (!folders.some((folderFromFolder) => room.id === folderFromFolder.id)) {
                return [...folders, room];
            } else {
                return folders;
            }
        });
    }
    private manageRoomOrFolder(room: Room): void {
        const { roomId } = room;

        if (this.isRoomAlreadyManaged(roomId)) return;

        if (this.handleMembershipStatus(room)) return;

        const parentRoomID = this.getFirstParentRoomID(room);

        if (parentRoomID) {
            //TODO : Refresh Parent instead of try to add ?
            const isAdded = this.tryAddRoomToParentFolder(room, parentRoomID);

            if (!isAdded && !room.isSpaceRoom()) {
                this.createAndAddNewRootRoom(room);
            }
        } else {
            this.handleOrphanRoom(room);
        }
    }
    private isRoomAlreadyManaged(roomId: string): boolean {
        if (this.roomList.has(roomId)) {
            console.warn("Room already exists in the root list");
            return true;
        }

        if (this.findRoomOrFolder(roomId)) {
            console.warn("Room already exists in a folder");
            return true;
        }

        return false;
    }
    private handleMembershipStatus(room: Room): boolean {
        const membershipStatus = room.getMyMembership();

        if (membershipStatus === KnownMembership.Invite) {
            this.createAndAddNewRootRoom(room);
            return true;
        }

        if (membershipStatus === KnownMembership.Ban || membershipStatus === KnownMembership.Leave) {
            return true; // Room shouldn't be added
        }

        return false;
    }
    private getFirstParentRoomID(room: Room): string | undefined {
        const parentRoomsIDs = this.getParentRoomID(room);
        return parentRoomsIDs.length > 0 ? parentRoomsIDs[0] : undefined;
    }

    private tryAddRoomToParentFolder(room: Room, parentRoomID: string): boolean {
        const isSpaceRoom = room.isSpaceRoom();
        for (const folder of get(this.roomFolders)) {
            const parentFolder = folder.id === parentRoomID ? folder : folder.getNode(parentRoomID);

            if (parentFolder && parentFolder instanceof MatrixRoomFolder) {
                if (isSpaceRoom) {
                    // this.addToFolder<MatrixRoomFolder>(folder.folders, new MatrixRoomFolder(room));
                } else {
                    this.addToFolder<MatrixChatRoom>(folder.rooms, new MatrixChatRoom(room));
                }
                return true;
            }
        }

        return false;
    }
    private handleOrphanRoom(room: Room): void {
        if (room.isSpaceRoom()) {
            this.createAndAddNewRootFolder(room);
        } else {
            this.createAndAddNewRootRoom(room);
        }
    }
    private findRoomOrFolder(roomId: string): MatrixRoomFolder | MatrixChatRoom | undefined {
        const folders = get(this.roomFolders);
        for (const folder of folders) {
            const roomOrFolder = folder.getNode(roomId);
            if (roomOrFolder) {
                return roomOrFolder;
            }
        }
        return undefined;
    }
    private createAndAddNewRootFolder(room: Room): void {
        const newFolder = new MatrixRoomFolder(room);
        this.addToFolder<MatrixRoomFolder>(this.roomFolders, newFolder);

        newFolder
            .getRoomsIdInNode()
            .then((roomIDs) => {
                roomIDs.forEach((roomID) => {
                    this.removeFromRootRoomList(roomID);
                });
            })
            .catch(() => {
                console.error("Failed to get child room IDs");
                Sentry.captureMessage("Failed to get child room IDs");
            });
    }
    private createAndAddNewRootRoom(room: Room): MatrixChatRoom {
        const newRoom = new MatrixChatRoom(room);
        this.roomList.set(newRoom.id, newRoom);
        return newRoom;
    }
    private onClientEventDeleteRoom(roomId: string) {
        this.deleteRoom(roomId);
    }
    private deleteRoom(roomId: string) {
        const isRootRoom = this.removeFromRootRoomList(roomId);
        if (isRootRoom) {
            return;
        }
        const folders = get(this.roomFolders);
        const isRootFolder = folders.some((folder) => {
            return folder.id === roomId;
        });

        if (isRootFolder) {
            return;
        }

        folders.forEach((folder) => {
            folder.deleteNode(roomId);
        });
        const currentRoom = get(selectedRoom)?.id;
        if (currentRoom && currentRoom === roomId) selectedRoom.set(undefined);
    }
    private onRoomEventMembership(room: Room, membership: string, prevMembership: string | undefined) {
        const { roomId } = room;
        const existingMatrixChatRoom =
            this.roomList.has(roomId) || get(this.roomFolders).some((folder) => folder.id === roomId);

        if (membership !== prevMembership && existingMatrixChatRoom) {
            if (membership === KnownMembership.Join) {
                this.removeFromRootRoomList(roomId);
                this.manageRoomOrFolder(room);
                return;
            }

            if (membership === KnownMembership.Invite) {
                this.createAndAddNewRootRoom(room);
                return;
            }
        }

        if (membership === KnownMembership.Leave || membership === KnownMembership.Ban) {
            this.deleteRoom(roomId);
            return;
        }
    }
    //TODO createOptions only on matrix size
    async createRoom(roomOptions?: CreateRoomOptions): Promise<{
        room_id: string;
    }> {
        if (roomOptions === undefined) {
            return Promise.reject(new Error("CreateRoomOptions is empty"));
        }

        try {
            const result = await this.client.createRoom(
                this.mapCreateRoomOptionsToMatrixCreateRoomOptions(roomOptions)
            );
            await new Promise<void>((resolve, _) => {
                this.client.once(ClientEvent.Sync, (state) => {
                    if (state === SyncState.Syncing) {
                        resolve();
                    }
                });
            });
            if (roomOptions.parentSpaceID) {
                this.addRoomToSpace(roomOptions.parentSpaceID, result.room_id);
                await new Promise<void>((resolve, _) => {
                    this.client.once(ClientEvent.Sync, (state) => {
                        if (state === SyncState.Syncing) {
                            resolve();
                        }
                    });
                });
            }

            return result;
        } catch (error) {
            throw this.handleMatrixError(error);
        }
    }

    async createFolder(roomOptions?: CreateRoomOptions): Promise<{
        room_id: string;
    }> {
        if (roomOptions === undefined) {
            return Promise.reject(new Error("CreateRoomOptions is empty"));
        }

        try {
            const result = await this.client.createRoom(
                this.mapCreateRoomOptionsToMatrixCreateFolderOptions(roomOptions)
            );
            await new Promise<void>((resolve, _) => {
                this.client.once(ClientEvent.Sync, (state) => {
                    if (state === SyncState.Syncing) {
                        resolve();
                    }
                });
            });
            if (roomOptions.parentSpaceID) {
                this.addRoomToSpace(roomOptions.parentSpaceID, result.room_id);
                await new Promise<void>((resolve, _) => {
                    this.client.once(ClientEvent.Sync, (state) => {
                        if (state === SyncState.Syncing) {
                            resolve();
                        }
                    });
                });
            }

            return result;
        } catch (error) {
            throw this.handleMatrixError(error);
        }
    }

    private handleMatrixError(error: unknown) {
        if (error instanceof MatrixError) {
            error.data.error;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            return new Error(error.data.error, { cause: error });
        }
        return error;
    }
    private mapCreateRoomOptionsToMatrixCreateRoomOptions(roomOptions: CreateRoomOptions): ICreateRoomOpts {
        const roomName = roomOptions.name;
        if (roomName === undefined) {
            throw new Error("Room name is undefined");
        }

        return {
            name: roomName.trim(),
            visibility: roomOptions.visibility as Visibility | undefined,
            room_alias_name: slugify(roomName),
            invite: roomOptions.invite?.map((invitation) => invitation.value) ?? [],
            is_direct: roomOptions.is_direct,
            initial_state: this.computeInitialState(roomOptions),
        };
    }

    private mapCreateRoomOptionsToMatrixCreateFolderOptions(roomOptions: CreateRoomOptions): ICreateRoomOpts {
        const roomName = roomOptions.name;
        if (roomName === undefined) {
            throw new Error("Room name is undefined");
        }

        return {
            name: roomName.trim(),
            visibility: roomOptions.visibility as Visibility | undefined,
            room_alias_name: slugify(roomName),
            invite: roomOptions.invite?.map((invitation) => invitation.value) ?? [],
            initial_state: this.computeInitialState(roomOptions), //gerer le space parent
            //topic : description,
            creation_content: {
                //TODO : add in modal creation
                "m.federate": true, // Set to false if you want the space to be non-federated
                type: "m.space",
            },
        };
    }

    private computeInitialState(roomOptions: CreateRoomOptions) {
        const { encrypt, historyVisibility } = roomOptions;
        const initial_state: ICreateRoomStateEvent[] = [];
        if (encrypt) {
            initial_state.push({ type: EventType.RoomEncryption, content: { algorithm: "m.megolm.v1.aes-sha2" } });
        }
        if (historyVisibility !== undefined) {
            initial_state.push({
                type: EventType.RoomHistoryVisibility,
                content: { history_visibility: roomOptions?.historyVisibility },
            });
        }

        if (roomOptions.parentSpaceID) {
            initial_state.push({
                type: EventType.SpaceParent,
                state_key: roomOptions.parentSpaceID,
                content: {
                    via: [this.client.getDomain()],
                },
            });
        }
        initial_state.push({ type: EventType.RoomGuestAccess, content: { guest_access: "can_join" } });

        return initial_state;
    }

    async createDirectRoom(userToInvite: string): Promise<ChatRoom | undefined> {
        const existingDirectRoom = this.getDirectRoomFor(userToInvite);

        if (existingDirectRoom) return existingDirectRoom;

        const createRoomOptions = {
            //TODO not clean code
            invite: [{ value: userToInvite, label: userToInvite }],
            is_direct: true,
            preset: "trusted_private_chat",
            visibility: "private",
        } as CreateRoomOptions;

        try {
            const { room_id } = await this.client.createRoom({
                visibility: "private" as Visibility | undefined,
                invite: createRoomOptions.invite?.map((invitation) => invitation.value) ?? [],
                is_direct: true,
                initial_state: this.computeInitialState(createRoomOptions),
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
            return this.createAndAddNewRootRoom(room);
        } catch (error) {
            throw this.handleMatrixError(error);
        }
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

    async searchChatUsers(searchText: string) {
        try {
            const searchUserResponse = await this.client.searchUserDirectory({ term: searchText, limit: 20 });
            return searchUserResponse.results.map((user) => ({ id: user.user_id, name: user.display_name }));
        } catch (error) {
            console.error("Unable to search matrix chat user with searchText: ", searchText, error);
        }
        return;
    }

    async searchAccessibleRooms(searchText = ""): Promise<
        {
            id: string;
            name: string | undefined;
        }[]
    > {
        const isGuestUser = get(this.isGuest);
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
                        .filter(({ room_id, guest_can_join }) => {
                            if (this.roomList.has(room_id)) {
                                return false;
                            }
                            if (!isGuestUser) {
                                return true;
                            } else {
                                return guest_can_join;
                            }
                        })
                        .map((chunkRoom) => {
                            console.debug(chunkRoom);
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
                    if (!roomAfterSync) {
                        return Promise.reject(new Error("Room not present after synchronization"));
                    }
                    const dmInviterId = roomAfterSync.getDMInviter();
                    if (dmInviterId) {
                        await this.addDMRoomInAccountData(dmInviterId, roomId);
                    }
                    res(this.createAndAddNewRootRoom(roomAfterSync));
                    return;
                })
                .catch((error) => {
                    console.error("Unable to join", error);
                    rej(this.handleMatrixError(error));
                    //rej(error);
                });
        });
    }

    initEndToEndEncryption(): Promise<void> {
        return this.matrixSecurity.initClientCryptoConfiguration();
    }

    private addRoomToSpace(spaceRoomId: string, childRoomId: string) {
        // Send the m.space.child event to link the room to the space
        this.client
            .sendStateEvent(
                spaceRoomId,
                //@ts-ignore
                EventType.SpaceChild,
                {
                    via: [this.client.getDomain()], // The domain of the homeserver to be used to join the room
                },
                childRoomId
            )
            .catch((error) => console.error("Error adding room to space : ", error));
    }

    private async addDMRoomInAccountData(userId: string, roomId: string) {
        const directMap: Record<string, string[]> = this.client.getAccountData("m.direct")?.getContent() || {};
        directMap[userId] = [...(directMap[userId] || []), roomId];
        await this.client.setAccountData("m.direct", directMap);
    }

    async destroy(): Promise<void> {
        await this.client.logout(true);
    }
}
