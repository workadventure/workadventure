import type { MatrixClient } from "matrix-js-sdk";
import { ClientEvent, EventType, PendingEventOrdering, RoomEvent, SyncState } from "matrix-js-sdk";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { KnownMembership } from "matrix-js-sdk/lib/types";
import type { Readable } from "svelte/store";
import { get, readable, writable } from "svelte/store";
import type { AvailabilityStatus } from "@workadventure/messages";
import { MatrixChatConnection } from "../MatrixChatConnection";
import { MatrixRoomFolder } from "../MatrixRoomFolder";
import type { CreateRoomOptions } from "../../ChatConnection";
import type { MatrixChatRoom } from "../MatrixChatRoom";
import type { MatrixRoomFolder } from "../MatrixRoomFolder";
import type { MatrixSecurity } from "../MatrixSecurity";
import type { RequestedStatus } from "../../../../Rules/StatusRules/statusRules";

vi.mock("../../../../Phaser/Game/GameManager", () => {
    return {
        gameManager: {
            getCurrentGameScene: () => ({
                playSound: vi.fn(),
                userProviderMerger: Promise.resolve({
                    usersByRoomStore: {
                        subscribe: vi.fn(() => () => undefined),
                    },
                }),
            }),
        },
    };
});

vi.mock("../../../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

vi.mock("../../../../Enum/EnvironmentVariable.ts", async (importOriginal) => {
    const actual = await importOriginal();
    return Object.assign({}, actual, {
        MATRIX_ADMIN_USER: "admin",
        MATRIX_DOMAIN: "domain",
    });
});

vi.mock("../../../Stores/ChatStore.ts", () => {
    return {
        selectedRoomStore: writable(undefined),
    };
});
describe("MatrixChatConnection", () => {
    const flushPromises = () => new Promise(setImmediate);

    afterEach(() => {
        vi.useRealTimers();
    });

    const basicStatusStore: Readable<
        | AvailabilityStatus.ONLINE
        | AvailabilityStatus.SILENT
        | AvailabilityStatus.AWAY
        | AvailabilityStatus.JITSI
        | AvailabilityStatus.BBB
        | AvailabilityStatus.DENY_PROXIMITY_MEETING
        | AvailabilityStatus.SPEAKER
        | AvailabilityStatus.LIVEKIT
        | RequestedStatus
    > = {
        subscribe: vi.fn(),
    };

    const basicMockMatrixSecurity: Partial<MatrixSecurity> = {
        isEncryptionRequiredAndNotSet: writable(false),
        updateMatrixClientStore: vi.fn(),
    };

    const getMatrixConnection = async (
        clientPromise: Promise<MatrixClient>,
        matrixSecurity: Partial<MatrixSecurity> = basicMockMatrixSecurity
    ) => {
        const matrixSecurityMock = {
            ...basicMockMatrixSecurity,
            ...matrixSecurity,
        } as unknown as MatrixSecurity;
        const matrixChatConnection = new MatrixChatConnection(clientPromise, basicStatusStore, matrixSecurityMock);
        await matrixChatConnection.init();
        return matrixChatConnection;
    };
    describe("Constructor", () => {
        const directChatRoom = {
            id: "directChatRoom",
            type: readable("direct"),
            myMembership: readable(KnownMembership.Join),
        } as unknown as MatrixChatRoom;
        const InviteDirectChatRoom = {
            id: "InviteDirectChatRoom",
            type: readable("direct"),
            myMembership: readable(KnownMembership.Invite),
        } as unknown as MatrixChatRoom;
        const multipleChatRoom = {
            id: "multipleChatRoom",
            type: readable("multiple"),
            myMembership: readable(KnownMembership.Join),
        } as unknown as MatrixChatRoom;
        const InviteMultipleChatRoom = {
            id: "InviteMultipleChatRoom",
            type: readable("multiple"),
            myMembership: readable(KnownMembership.Invite),
        } as unknown as MatrixChatRoom;

        beforeAll(() => {
            vi.restoreAllMocks();
        });

        it("should contains all room with type direct and KnownMembership = join from roomList in directRooms", async () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);
            const matrixChatConnection = await getMatrixConnection(clientPromise);

            //set matrixChatConnection RoomList
            matrixChatConnection["roomList"].set(directChatRoom.id, directChatRoom);
            matrixChatConnection["roomList"].set(InviteDirectChatRoom.id, InviteDirectChatRoom);
            matrixChatConnection["roomList"].set(multipleChatRoom.id, multipleChatRoom);
            matrixChatConnection["roomList"].set(InviteMultipleChatRoom.id, InviteMultipleChatRoom);

            expect(get(matrixChatConnection["directRooms"])).toHaveLength(1);

            matrixChatConnection["roomList"].set(directChatRoom.id + "2", directChatRoom);

            expect(get(matrixChatConnection["directRooms"])).toHaveLength(2);
            expect(get(matrixChatConnection["directRooms"]).includes(directChatRoom)).toBeTruthy();

            expect(get(matrixChatConnection["directRooms"]).includes(InviteMultipleChatRoom)).toBeFalsy();
            expect(get(matrixChatConnection["directRooms"]).includes(multipleChatRoom)).toBeFalsy();
            expect(get(matrixChatConnection["directRooms"]).includes(InviteDirectChatRoom)).toBeFalsy();
        });
        it("should contains all room with type multiple and KnownMembership = join from roomList in rooms", async () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);
            const matrixChatConnection = await getMatrixConnection(clientPromise);

            //set matrixChatConnection RoomList
            matrixChatConnection["roomList"].set(directChatRoom.id, directChatRoom);
            matrixChatConnection["roomList"].set(InviteDirectChatRoom.id, InviteDirectChatRoom);
            matrixChatConnection["roomList"].set(multipleChatRoom.id, multipleChatRoom);
            matrixChatConnection["roomList"].set(InviteMultipleChatRoom.id, InviteMultipleChatRoom);

            expect(get(matrixChatConnection["rooms"])).toHaveLength(1);

            matrixChatConnection["roomList"].set(multipleChatRoom.id + "2", multipleChatRoom);

            expect(get(matrixChatConnection["rooms"])).toHaveLength(2);
            expect(get(matrixChatConnection["rooms"]).includes(multipleChatRoom)).toBeTruthy();

            expect(get(matrixChatConnection["rooms"]).includes(InviteMultipleChatRoom)).toBeFalsy();
            expect(get(matrixChatConnection["rooms"]).includes(directChatRoom)).toBeFalsy();
            expect(get(matrixChatConnection["rooms"]).includes(InviteDirectChatRoom)).toBeFalsy();
        });
        it("should contains all room with KnownMembership = invite from roomList in invitations", async () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);
            const matrixChatConnection = await getMatrixConnection(clientPromise);

            //set matrixChatConnection RoomList
            matrixChatConnection["roomList"].set(directChatRoom.id, directChatRoom);
            matrixChatConnection["roomList"].set(InviteDirectChatRoom.id, InviteDirectChatRoom);
            matrixChatConnection["roomList"].set(multipleChatRoom.id, multipleChatRoom);
            matrixChatConnection["roomList"].set(InviteMultipleChatRoom.id, InviteMultipleChatRoom);

            expect(get(matrixChatConnection["invitations"])).toHaveLength(2);

            expect(get(matrixChatConnection["invitations"]).includes(InviteMultipleChatRoom)).toBeTruthy();
            expect(get(matrixChatConnection["invitations"]).includes(InviteDirectChatRoom)).toBeTruthy();

            expect(get(matrixChatConnection["invitations"]).includes(multipleChatRoom)).toBeFalsy();
            expect(get(matrixChatConnection["invitations"]).includes(directChatRoom)).toBeFalsy();

            matrixChatConnection["roomList"].set(InviteMultipleChatRoom.id + "2", InviteMultipleChatRoom);
            expect(get(matrixChatConnection["invitations"])).toHaveLength(3);
        });
        it("should set isEncryptionRequiredAndNotSet with value of isEncryptionRequiredAndNotSet from matrixSecurity", async () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const mockMatrixSecurity = {
                isEncryptionRequiredAndNotSet: writable(false),
                updateMatrixClientStore: vi.fn(),
            } as Partial<MatrixSecurity>;

            const matrixChatConnection = await getMatrixConnection(clientPromise, mockMatrixSecurity);

            expect(matrixChatConnection["isEncryptionRequiredAndNotSet"]).toBe(
                mockMatrixSecurity.isEncryptionRequiredAndNotSet
            );
        });
        it.each([[true], [false]])(
            "should set isEncryptionRequiredAndNotSet with value of isEncryptionRequiredAndNotSet from matrixSecurity ",
            async (expected) => {
                const mockMatrixClient = {} as unknown as MatrixClient;

                const clientPromise = Promise.resolve(mockMatrixClient);

                const mockMatrixSecurity = {
                    isEncryptionRequiredAndNotSet: writable(expected),
                    updateMatrixClientStore: vi.fn(),
                } as Partial<MatrixSecurity>;

                const matrixChatConnection = await getMatrixConnection(clientPromise, mockMatrixSecurity);

                expect(matrixChatConnection["isEncryptionRequiredAndNotSet"]).toBe(
                    mockMatrixSecurity.isEncryptionRequiredAndNotSet
                );
            }
        );

        it("should call startMatrixClient when client promise resolve", async () => {
            vi.restoreAllMocks();
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const startMatrixClientSpy = vi.spyOn(MatrixChatConnection.prototype, "startMatrixClient");

            await getMatrixConnection(clientPromise);
            await clientPromise;

            expect(startMatrixClientSpy).toHaveBeenCalledOnce();
        });
        it("should not call startMatrixClient when client promise reject", async () => {
            vi.restoreAllMocks();
            const clientPromise = Promise.reject(new Error(""));

            const startMatrixClientSpy = vi.spyOn(MatrixChatConnection.prototype, "startMatrixClient");

            await getMatrixConnection(clientPromise);
            await expect(clientPromise).rejects.toThrowError("");

            expect(startMatrixClientSpy).not.toHaveBeenCalled();
        });

        it("should destroy the previous room wrapper when replacing a room with the same id", async () => {
            const mockMatrixClient = {} as unknown as MatrixClient;
            const clientPromise = Promise.resolve(mockMatrixClient);
            const matrixChatConnection = await getMatrixConnection(clientPromise);

            const firstRoomDestroyMock = vi.fn();
            const firstRoom = {
                id: "room-id",
                destroy: firstRoomDestroyMock,
            } as unknown as MatrixChatRoom;
            const secondRoom = {
                id: "room-id",
                destroy: vi.fn(),
            } as unknown as MatrixChatRoom;

            matrixChatConnection["setRootRoom"](firstRoom);
            matrixChatConnection["setRootRoom"](secondRoom);

            expect(firstRoomDestroyMock).toHaveBeenCalledOnce();
            expect(matrixChatConnection["roomList"].get(firstRoom.id)).toBe(secondRoom);
        });

        it("should return the already managed room wrapper from getRoomByID", async () => {
            const mockMatrixRoom = {
                roomId: "room-id",
                name: "Managed room",
                getUnreadNotificationCount: vi.fn().mockReturnValue(0),
                getAvatarUrl: vi.fn(),
                getMyMembership: vi.fn().mockReturnValue(KnownMembership.Join),
                getMembers: vi.fn().mockReturnValue([]),
                getLiveTimeline: vi.fn().mockReturnValue({
                    getTimelineSet: vi.fn(),
                    getState: vi.fn().mockReturnValue({
                        hasSufficientPowerLevelFor: vi.fn().mockReturnValue(false),
                    }),
                }),
                hasEncryptionStateEvent: vi.fn().mockReturnValue(false),
                getPendingEvents: vi.fn().mockReturnValue([]),
                isSpaceRoom: vi.fn().mockReturnValue(false),
                currentState: {
                    on: vi.fn(),
                    off: vi.fn(),
                },
                on: vi.fn(),
                off: vi.fn(),
                client: {
                    baseUrl: "https://matrix.example",
                    getUserId: vi.fn().mockReturnValue("@alice:matrix.example"),
                    getSafeUserId: vi.fn().mockReturnValue("@alice:matrix.example"),
                    getAccountData: vi.fn().mockReturnValue({
                        getContent: () => ({
                            global: {
                                override: [],
                            },
                        }),
                    }),
                    mxcUrlToHttp: vi.fn(),
                    isInitialSyncComplete: vi.fn().mockReturnValue(false),
                },
            };
            const mockMatrixClient = {
                getRoom: vi.fn().mockReturnValue(mockMatrixRoom),
            } as unknown as MatrixClient;

            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));
            const managedRoom = {
                id: "room-id",
            } as unknown as MatrixChatRoom;

            matrixChatConnection["setRootRoom"](managedRoom);

            expect(matrixChatConnection.getRoomByID("room-id")).toBe(managedRoom);
        });
    });

    describe("startMatrixClient", () => {
        it.each([
            [ClientEvent.Sync],
            [ClientEvent.Room],
            [ClientEvent.DeleteRoom],
            [RoomEvent.MyMembership],
            [RoomEvent.Name],
            ["RoomState.events"],
        ])("should call this.client.on for event %s", async (expectedEventName) => {
            const onMock = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: onMock,
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            onMock.mockRestore();
            await matrixChatConnection.startMatrixClient();

            expect(onMock.mock.calls.some(([eventName, _]) => eventName === expectedEventName)).toBeTruthy();
        });
        it("should start store from matrix client", async () => {
            const startUpMock = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: startUpMock,
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;
            startUpMock.mockRestore();
            await matrixChatConnection.startMatrixClient();

            expect(startUpMock).toHaveBeenCalledOnce();
        });

        it("should init crypto", async () => {
            const initCryptoMock = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: initCryptoMock,
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;
            await flushPromises();
            initCryptoMock.mockRestore();
            await matrixChatConnection.startMatrixClient();

            expect(initCryptoMock).toHaveBeenCalledOnce();
        });
        it("should start client with options", async () => {
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            await flushPromises();

            mockStartClient.mockRestore();
            await matrixChatConnection.startMatrixClient();

            expect(mockStartClient).toHaveBeenCalledOnce();

            expect(mockStartClient).toHaveBeenCalledWith({
                threadSupport: false,
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
        });
    });

    describe("lifecycle cleanup", () => {
        it("clearListener should destroy tracked rooms and detach every registered client listener", async () => {
            const offMock = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                off: offMock,
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));

            const roomDestroyMock = vi.fn();
            const room = {
                id: "room-id",
                destroy: roomDestroyMock,
            } as unknown as MatrixChatRoom;
            const folderDestroyMock = vi.fn();
            const folder = {
                id: "folder-id",
                destroy: folderDestroyMock,
            } as unknown as MatrixRoomFolder;

            matrixChatConnection["roomList"].set(room.id, room);
            matrixChatConnection["roomFolders"].set(folder.id, folder);
            matrixChatConnection["userIdsNeedingPresenceUpdate"].add("@alice:matrix.example");

            matrixChatConnection.clearListener();

            expect(roomDestroyMock).toHaveBeenCalledOnce();
            expect(folderDestroyMock).toHaveBeenCalledOnce();
            expect(matrixChatConnection["roomList"].size).toBe(0);
            expect(matrixChatConnection["roomFolders"].size).toBe(0);
            expect(matrixChatConnection["userIdsNeedingPresenceUpdate"].size).toBe(0);
            expect(offMock).toHaveBeenCalledWith(ClientEvent.Sync, matrixChatConnection["handleSync"]);
            expect(offMock).toHaveBeenCalledWith(
                ClientEvent.AccountData,
                matrixChatConnection["handleAccountDataEvent"]
            );
        });

        it("destroy should clear local listeners before logging out", async () => {
            const logoutMock = vi.fn().mockResolvedValue(undefined);
            const mockMatrixClient = {
                isGuest: vi.fn(),
                off: vi.fn(),
                on: vi.fn(),
                logout: logoutMock,
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));
            const clearListenerSpy = vi.spyOn(matrixChatConnection, "clearListener");

            await matrixChatConnection.destroy();

            expect(clearListenerSpy).toHaveBeenCalledOnce();
            expect(logoutMock).toHaveBeenCalledOnce();
            expect(logoutMock).toHaveBeenCalledWith(true);
        });
    });

    describe("computeInitialState", () => {
        it("should add encryption option to initial state when encrypt from roomOptions is true", async () => {
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            const roomOptions = {
                encrypt: true,
            };

            expect(matrixChatConnection["computeInitialState"](roomOptions)).toContainEqual({
                type: EventType.RoomEncryption,
                content: { algorithm: "m.megolm.v1.aes-sha2" },
            });
        });
        it("should not add encryption option to initial state when encrypt from roomOptions is false", async () => {
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            const roomOptions = {
                encrypt: false,
            };

            expect(matrixChatConnection["computeInitialState"](roomOptions)).not.toContainEqual({
                type: EventType.RoomEncryption,
                content: { algorithm: "m.megolm.v1.aes-sha2" },
            });
        });
        it("should add historyVisibility option to initial state when historyVisibility from roomOptions is defined", async () => {
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            const roomOptions = {
                historyVisibility: "joined",
            } as unknown as CreateRoomOptions;

            expect(matrixChatConnection["computeInitialState"](roomOptions)).toContainEqual({
                type: EventType.RoomHistoryVisibility,
                content: { history_visibility: roomOptions.historyVisibility },
            });
        });

        it("should not add historyVisibility option to initial state when historyVisibility from roomOptions is undefined", async () => {
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            const roomOptions = {} as unknown as CreateRoomOptions;

            expect(
                matrixChatConnection["computeInitialState"](roomOptions).find(
                    (option) => option.type === EventType.RoomHistoryVisibility
                )
            ).toEqual(undefined);
        });
    });

    describe("createRoom", () => {
        it("should reject promise when roomOptions is undefined", async () => {
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await expect(matrixChatConnection.createRoom()).rejects.toThrowError("CreateRoomOptions is empty");
        });

        it("should return client.createRoom Reject error when roomOptions is defined but name is undefined", async () => {
            const expected = {
                room_id: "1",
            };
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(expected),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            await expect(matrixChatConnection.createRoom({})).rejects.toThrowError("Room name is undefined");
        });
        it("should return client.createRoom Result when roomOptions is defined", async () => {
            const expected = {
                room_id: "1",
            };
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                off: vi.fn(),
                on: vi.fn((_, callback) => {
                    callback(SyncState.Syncing);
                }),
                once: vi.fn().mockImplementation((_, callback) => {
                    callback(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(expected),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;
            expect(await matrixChatConnection.createRoom({ name: "Test" })).toEqual(expected);
        });
    });
    describe("createDirectRoom", () => {
        it("should return existing direct room when a direct room already exist with this user  ", async () => {
            const expected = {
                room_id: "1",
            };
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(expected),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);
            await clientPromise;

            const userId = "AliceID";
            const oldDirectRoom = {
                id: "old_direct_room",
            } as unknown as MatrixChatRoom;

            const spyGetDirectRoomFor = vi.spyOn(matrixChatConnection, "getDirectRoomFor");

            spyGetDirectRoomFor.mockImplementation(() => oldDirectRoom);
            matrixChatConnection["addDMRoomInAccountData"] = vi.fn();

            expect(await matrixChatConnection.createDirectRoom(userId)).toEqual(oldDirectRoom);
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.createRoom).not.toHaveBeenCalled();
            expect(matrixChatConnection["addDMRoomInAccountData"]).not.toHaveBeenCalled();
        });
        it("should create new room / add it to account data and add it to roomList ", async () => {
            const expected = {
                room_id: "1",
            };
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                off: vi.fn(),
                on: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                once: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(expected),
                getRoom: vi.fn(),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            const userId = "AliceID";

            const spyGetDirectRoomFor = vi.spyOn(matrixChatConnection, "getDirectRoomFor");
            spyGetDirectRoomFor.mockImplementation(() => undefined);

            matrixChatConnection["createRoom"] = vi.fn().mockResolvedValue({
                room_id: "newRoomId",
            });

            matrixChatConnection["addDMRoomInAccountData"] = vi.fn();

            await matrixChatConnection.createDirectRoom(userId);

            expect(mockMatrixClient["createRoom"]).toHaveBeenCalledOnce();
            expect(matrixChatConnection["addDMRoomInAccountData"]).toHaveBeenCalledOnce();
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.getRoom).toHaveBeenCalledOnce();
        });
    });
    describe("searchAccessibleRooms", () => {
        it("should search all public rooms with searchText in the options", async () => {
            const roomSearchText = "roomToSearch";
            const mockStartClient = vi.fn();
            const mockPublicRoom = vi.fn().mockResolvedValue({
                chunk: [],
            });

            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                once: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(""),
                getRoom: vi.fn(),
                publicRooms: mockPublicRoom,
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;
            await flushPromises();

            await matrixChatConnection.searchAccessibleRooms(roomSearchText);

            expect(mockPublicRoom).toHaveBeenCalledOnce();
            expect(mockPublicRoom.mock.calls[0][0].filter.generic_search_term).toEqual(roomSearchText);
        });
        it("should only return rooms that are not in the room list", async () => {
            const roomSearchText = "roomToSearch";
            const mockStartClient = vi.fn();
            const mockPublicRoom = vi.fn().mockResolvedValue({
                chunk: [
                    {
                        room_id: roomSearchText,
                        name: roomSearchText,
                    },
                    {
                        room_id: "Other_room",
                        name: "Other_room",
                    },
                ],
            });

            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                once: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(""),
                getRoom: vi.fn(),
                publicRooms: mockPublicRoom,
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            const roomAlreadyInRoomList = {
                id: roomSearchText,
            } as unknown as MatrixChatRoom;

            matrixChatConnection["roomList"].set(roomAlreadyInRoomList.id, roomAlreadyInRoomList);

            await clientPromise;
            await flushPromises();

            const result = await matrixChatConnection.searchAccessibleRooms(roomSearchText);

            expect(result).toContainEqual({
                id: "Other_room",
                name: "Other_room",
            });

            expect(result).not.toContainEqual({
                id: roomSearchText,
                name: roomSearchText,
            });
        });
    });

    describe("joinRoom", () => {
        it("should join new room and set roomlist with new data", async () => {
            const mockGetDMInviter = vi.fn().mockReturnValue(undefined);

            const expected = {
                room_id: "1",
            };
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                off: vi.fn(),
                on: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                once: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(expected),
                getRoom: vi.fn().mockReturnValue({
                    getDMInviter: mockGetDMInviter,
                }),
                joinRoom: vi.fn().mockResolvedValue(""),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            vi.mock("../MatrixChatRoom", () => ({
                MatrixChatRoom: vi.fn(),
            }));

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            const roomID = "room-id";

            matrixChatConnection["addDMRoomInAccountData"] = vi.fn();
            await matrixChatConnection.joinRoom(roomID);

            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.joinRoom).toHaveBeenCalledOnce();
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.getRoom).toHaveBeenCalledOnce();
            expect(mockGetDMInviter).toHaveBeenCalledOnce();

            expect(matrixChatConnection["addDMRoomInAccountData"]).not.toHaveBeenCalledOnce();
        });
        it("should add room in account data when user join a direct room", async () => {
            const mockGetDMInviter = vi.fn().mockReturnValue("dmInviterID");

            const expected = {
                room_id: "1",
            };
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                off: vi.fn(),
                on: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                once: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(expected),
                getRoom: vi.fn().mockReturnValue({
                    getDMInviter: mockGetDMInviter,
                }),
                joinRoom: vi.fn().mockResolvedValue(""),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            vi.mock("../MatrixChatRoom", () => ({
                MatrixChatRoom: vi.fn(),
            }));

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            const roomID = "room-id";

            matrixChatConnection["addDMRoomInAccountData"] = vi.fn();

            await matrixChatConnection.joinRoom(roomID);
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.joinRoom).toHaveBeenCalledOnce();
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.getRoom).toHaveBeenCalledOnce();
            expect(mockGetDMInviter).toHaveBeenCalledOnce();

            expect(matrixChatConnection["addDMRoomInAccountData"]).toHaveBeenCalledOnce();
        });

        it("Room not present after synchronization", async () => {
            const expected = {
                room_id: "1",
            };
            const mockStartClient = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                off: vi.fn(),
                on: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                once: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn().mockResolvedValue(expected),
                getRoom: vi.fn().mockReturnValue(null),
                joinRoom: vi.fn().mockResolvedValue(""),
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            vi.mock("../MatrixChatRoom", () => ({
                MatrixChatRoom: vi.fn(),
            }));

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            const roomID = "room-id";

            matrixChatConnection["addDMRoomInAccountData"] = vi.fn();

            await expect(matrixChatConnection.joinRoom(roomID)).rejects.toThrow(
                "Room not present after synchronization"
            );
        });
    });
    describe("addDMRoomInAccountData", () => {
        it("should create and set account data when account data is undefined", async () => {
            const mockStartClient = vi.fn();
            const mockGetContent = vi.fn().mockReturnValue(null);
            const mockSetAccountData = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                once: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn(),
                getRoom: vi.fn().mockReturnValue(null),
                joinRoom: vi.fn().mockResolvedValue(""),
                getAccountData: vi.fn().mockReturnValue({
                    getContent: mockGetContent,
                }),
                setAccountData: mockSetAccountData,
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            const userId = "AliceId";
            const roomId = "roomTest";
            await matrixChatConnection["addDMRoomInAccountData"](userId, roomId);

            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.getAccountData).toHaveBeenCalledOnce();
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.getAccountData).toHaveBeenCalledWith("m.direct");
            expect(mockGetContent).toHaveBeenCalledOnce();
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.setAccountData).toHaveBeenCalledOnce();

            expect(mockSetAccountData.mock.calls[0][0]).toBe("m.direct");
            expect(mockSetAccountData.mock.calls[0][1][userId]).toEqual([roomId]);
        });
        it("should get account data / add new direct room in Account Data and set account data when account data is defined", async () => {
            const userId = "AliceId";
            const roomId = "roomTest";
            const roomId2 = "roomTest2";

            const directRoomAccountData: Record<string, string[]> = { [userId]: [roomId] };

            const mockStartClient = vi.fn();
            const mockGetContent = vi.fn().mockReturnValue(directRoomAccountData);
            const mockSetAccountData = vi.fn();
            const mockMatrixClient = {
                isGuest: vi.fn(),
                on: vi.fn(),
                once: vi.fn().mockImplementation((_, funcToResolve) => {
                    funcToResolve(SyncState.Syncing);
                }),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: mockStartClient,
                createRoom: vi.fn(),
                getRoom: vi.fn().mockReturnValue(null),
                joinRoom: vi.fn().mockResolvedValue(""),
                getAccountData: vi.fn().mockReturnValue({
                    getContent: mockGetContent,
                }),
                setAccountData: mockSetAccountData,
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = await getMatrixConnection(clientPromise);

            await clientPromise;

            await matrixChatConnection["addDMRoomInAccountData"](userId, roomId2);

            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.getAccountData).toHaveBeenCalledOnce();
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.getAccountData).toHaveBeenCalledWith("m.direct");
            expect(mockGetContent).toHaveBeenCalledOnce();
            //eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockMatrixClient.setAccountData).toHaveBeenCalledOnce();

            expect(mockSetAccountData.mock.calls[0][0]).toBe("m.direct");
            expect(mockSetAccountData.mock.calls[0][1][userId]).toContain(roomId);
            expect(mockSetAccountData.mock.calls[0][1][userId]).toContain(roomId2);
        });
    });

    describe("space topology handling", () => {
        it("should remove existing child when folder getChildren sees an m.space.child event without via", () => {
            const roomId = "!child:server";
            const childRoom = {
                roomId,
                getMyMembership: vi.fn().mockReturnValue(KnownMembership.Join),
                isSpaceRoom: vi.fn().mockReturnValue(false),
            };
            const parentRoom = {
                client: {
                    getRoomUpgradeHistory: vi.fn().mockReturnValue([childRoom]),
                },
                getLiveTimeline: vi.fn().mockReturnValue({
                    getState: vi.fn().mockReturnValue({
                        getStateEvents: vi.fn().mockReturnValue([
                            {
                                getStateKey: vi.fn().mockReturnValue(roomId),
                                getContent: vi.fn().mockReturnValue({}),
                            },
                        ]),
                    }),
                }),
            };
            const staleRoom = { destroy: vi.fn() };
            const folder = Object.create(MatrixRoomFolder.prototype) as MatrixRoomFolder;
            folder["room"] = parentRoom as never;
            folder.roomList = new Map([[roomId, staleRoom]]) as never;
            folder.folderList = new Map() as never;

            folder.getChildren();

            expect(folder.roomList.has(roomId)).toBeFalsy();
            expect(staleRoom.destroy).toHaveBeenCalledOnce();
        });

        it("should ignore a parent relation when the parent has no matching m.space.child", () => {
            const roomId = "!child:server";
            const staleParentId = "!space-parent:server";
            const directParentId = "!space-direct-parent:server";

            const makeStateEvent = (stateKey: string, content: unknown) => ({
                getStateKey: vi.fn().mockReturnValue(stateKey),
                getContent: vi.fn().mockReturnValue(content),
            });
            const makeRoomWithChildren = (childEvents: ReturnType<typeof makeStateEvent>[]) => ({
                getMyMembership: vi.fn().mockReturnValue(KnownMembership.Join),
                getLiveTimeline: vi.fn().mockReturnValue({
                    getState: vi.fn().mockReturnValue({
                        getStateEvents: vi.fn().mockReturnValue(childEvents),
                    }),
                }),
            });

            const staleParentRoom = makeRoomWithChildren([makeStateEvent(directParentId, { via: ["server"] })]);
            const directParentRoom = makeRoomWithChildren([makeStateEvent(roomId, { via: ["server"] })]);
            const matrixClient = {
                getRoom: vi.fn().mockImplementation((id: string) => {
                    if (id === staleParentId) return staleParentRoom;
                    if (id === directParentId) return directParentRoom;
                    return undefined;
                }),
            };
            const room = {
                roomId,
                client: matrixClient,
                getLiveTimeline: vi.fn().mockReturnValue({
                    getState: vi.fn().mockReturnValue({
                        getStateEvents: vi
                            .fn()
                            .mockReturnValue([
                                makeStateEvent(staleParentId, { via: ["server"] }),
                                makeStateEvent(directParentId, { via: ["server"] }),
                            ]),
                    }),
                }),
            };
            const matrixChatConnection = new MatrixChatConnection(
                Promise.resolve(matrixClient as unknown as MatrixClient),
                basicStatusStore,
                basicMockMatrixSecurity
            );

            expect(matrixChatConnection["getParentRoomID"](room as never)).toEqual([directParentId]);
        });

        it("should ignore a parent relation when the parent space is left", () => {
            const roomId = "!child:server";
            const leftParentId = "!space-left-parent:server";

            const childEvent = {
                getStateKey: vi.fn().mockReturnValue(roomId),
                getContent: vi.fn().mockReturnValue({ via: ["server"] }),
            };
            const leftParentRoom = {
                getMyMembership: vi.fn().mockReturnValue(KnownMembership.Leave),
                getLiveTimeline: vi.fn().mockReturnValue({
                    getState: vi.fn().mockReturnValue({
                        getStateEvents: vi.fn().mockReturnValue([childEvent]),
                    }),
                }),
            };
            const matrixClient = {
                getRoom: vi.fn().mockImplementation((id: string) => {
                    if (id === leftParentId) return leftParentRoom;
                    return undefined;
                }),
            };
            const room = {
                roomId,
                client: matrixClient,
                getLiveTimeline: vi.fn().mockReturnValue({
                    getState: vi.fn().mockReturnValue({
                        getStateEvents: vi.fn().mockReturnValue([
                            {
                                getStateKey: vi.fn().mockReturnValue(leftParentId),
                                getContent: vi.fn().mockReturnValue({ via: ["server"] }),
                            },
                        ]),
                    }),
                }),
            };
            const matrixChatConnection = new MatrixChatConnection(
                Promise.resolve(matrixClient as unknown as MatrixClient),
                basicStatusStore,
                basicMockMatrixSecurity
            );

            expect(matrixChatConnection["getParentRoomID"](room as never)).toEqual([]);
        });

        it("should return the nested folder itself when searching a deep folder node", async () => {
            const rootFolder = Object.assign(Object.create(MatrixRoomFolder.prototype), {
                id: "!space-root:server",
                roomList: new Map(),
                folderList: new Map(),
                loadRoomsAndFolderPromise: { promise: Promise.resolve() },
            }) as MatrixRoomFolder;
            const intermediateFolder = Object.assign(Object.create(MatrixRoomFolder.prototype), {
                id: "!space-intermediate:server",
                roomList: new Map(),
                folderList: new Map(),
                loadRoomsAndFolderPromise: { promise: Promise.resolve() },
            }) as MatrixRoomFolder;
            const nestedFolder = Object.assign(Object.create(MatrixRoomFolder.prototype), {
                id: "!space-nested:server",
                roomList: new Map(),
                folderList: new Map(),
                loadRoomsAndFolderPromise: { promise: Promise.resolve() },
            }) as MatrixRoomFolder;
            rootFolder.folderList.set(intermediateFolder.id, intermediateFolder);
            intermediateFolder.folderList.set(nestedFolder.id, nestedFolder);

            await expect(rootFolder.getNode(nestedFolder.id)).resolves.toBe(nestedFolder);
        });

        it("should reconcile joined child rooms when leaving a folder", async () => {
            const folderId = "!space-left:server";
            const childRoomId = "!child:server";
            const childNode = {
                id: childRoomId,
                myMembership: readable(KnownMembership.Join),
            };
            const folder = Object.assign(Object.create(MatrixRoomFolder.prototype), {
                id: folderId,
                roomList: new Map([[childRoomId, childNode]]),
                folderList: new Map(),
                loadRoomsAndFolderPromise: { promise: Promise.resolve() },
            }) as MatrixRoomFolder;
            const matrixChatConnection = new MatrixChatConnection(
                Promise.resolve({} as MatrixClient),
                basicStatusStore,
                basicMockMatrixSecurity
            );
            matrixChatConnection["roomFolders"].set(folderId, folder);
            const reconcileRoomPlacement = vi
                .spyOn(
                    matrixChatConnection as unknown as {
                        reconcileRoomPlacement: (roomId: string) => Promise<"root">;
                    },
                    "reconcileRoomPlacement"
                )
                .mockResolvedValue("root");

            matrixChatConnection["onRoomEventMembership"](
                { roomId: folderId, name: "Left space" } as never,
                KnownMembership.Leave,
                KnownMembership.Join
            );
            await flushPromises();

            expect(matrixChatConnection["roomFolders"].has(folderId)).toBeFalsy();
            expect(reconcileRoomPlacement).toHaveBeenCalledWith(childRoomId);
        });

        it("should reparent child rooms to the visible parent space when leaving a nested folder", async () => {
            const parentFolderId = "!space-parent:server";
            const leftFolderId = "!space-left:server";
            const childRoomId = "!child:server";
            const childNode = {
                id: childRoomId,
                myMembership: readable(KnownMembership.Join),
            };
            const leftFolder = Object.assign(Object.create(MatrixRoomFolder.prototype), {
                id: leftFolderId,
                roomList: new Map([[childRoomId, childNode]]),
                folderList: new Map(),
                myMembership: readable(KnownMembership.Leave),
                loadRoomsAndFolderPromise: { promise: Promise.resolve() },
            }) as MatrixRoomFolder;
            const parentFolder = Object.assign(Object.create(MatrixRoomFolder.prototype), {
                id: parentFolderId,
                roomList: new Map(),
                folderList: new Map([[leftFolderId, leftFolder]]),
                myMembership: readable(KnownMembership.Join),
                loadRoomsAndFolderPromise: { promise: Promise.resolve() },
            }) as MatrixRoomFolder;
            parentFolder.deleteNode = vi.fn().mockImplementation((id: string) => {
                parentFolder.folderList.delete(id);
                return true;
            });
            const makeStateEvent = (stateKey: string, content: unknown) => ({
                getStateKey: vi.fn().mockReturnValue(stateKey),
                getContent: vi.fn().mockReturnValue(content),
            });
            const makeParentRoom = (membership: KnownMembership) => ({
                getMyMembership: vi.fn().mockReturnValue(membership),
                getLiveTimeline: vi.fn().mockReturnValue({
                    getState: vi.fn().mockReturnValue({
                        getStateEvents: vi.fn().mockReturnValue([makeStateEvent(childRoomId, { via: ["server"] })]),
                    }),
                }),
            });
            const matrixClient = {
                getRoom: vi.fn(),
            };
            const childRoom = {
                roomId: childRoomId,
                client: matrixClient,
                isSpaceRoom: vi.fn().mockReturnValue(false),
                getMyMembership: vi.fn().mockReturnValue(KnownMembership.Join),
                getLiveTimeline: vi.fn().mockReturnValue({
                    getState: vi.fn().mockReturnValue({
                        getStateEvents: vi
                            .fn()
                            .mockReturnValue([
                                makeStateEvent(leftFolderId, { via: ["server"] }),
                                makeStateEvent(parentFolderId, { via: ["server"] }),
                            ]),
                    }),
                }),
            };
            matrixClient.getRoom.mockImplementation((id: string) => {
                if (id === childRoomId) return childRoom;
                if (id === leftFolderId) return makeParentRoom(KnownMembership.Leave);
                if (id === parentFolderId) return makeParentRoom(KnownMembership.Join);
                return undefined;
            });
            const matrixChatConnection = new MatrixChatConnection(
                Promise.resolve(matrixClient as unknown as MatrixClient),
                basicStatusStore,
                basicMockMatrixSecurity
            );
            matrixChatConnection["client"] = matrixClient as never;
            matrixChatConnection["roomFolders"].set(parentFolderId, parentFolder);
            const addRoomToParentFolder = vi
                .spyOn(
                    matrixChatConnection as unknown as {
                        addRoomToParentFolder: (room: unknown, folder: MatrixRoomFolder) => Promise<void>;
                    },
                    "addRoomToParentFolder"
                )
                .mockResolvedValue(undefined);

            matrixChatConnection["onRoomEventMembership"](
                { roomId: leftFolderId, name: "Left nested space" } as never,
                KnownMembership.Leave,
                KnownMembership.Join
            );
            await flushPromises();

            expect(addRoomToParentFolder).toHaveBeenCalledOnce();
            expect(addRoomToParentFolder.mock.calls[0][0]).toBe(childRoom);
            expect(addRoomToParentFolder.mock.calls[0][1]).toBe(parentFolder);
        });

        it("should fallback a pending joined room to root after bounded placement retries", async () => {
            vi.useFakeTimers();
            const roomId = "!child:server";
            const unknownParentId = "!unknown-parent:server";
            const room = {
                roomId,
                isSpaceRoom: vi.fn().mockReturnValue(false),
                getMyMembership: vi.fn().mockReturnValue(KnownMembership.Join),
                getLiveTimeline: vi.fn().mockReturnValue({
                    getState: vi.fn().mockReturnValue({
                        getStateEvents: vi.fn().mockReturnValue([
                            {
                                getStateKey: vi.fn().mockReturnValue(unknownParentId),
                                getContent: vi.fn().mockReturnValue({ via: ["server"] }),
                            },
                        ]),
                    }),
                }),
            };
            const matrixClient = {
                getRoom: vi.fn().mockImplementation((id: string) => {
                    if (id === roomId) return room;
                    return undefined;
                }),
            };
            const matrixChatConnection = new MatrixChatConnection(
                Promise.resolve(matrixClient as unknown as MatrixClient),
                basicStatusStore,
                basicMockMatrixSecurity
            );
            matrixChatConnection["client"] = matrixClient as never;
            vi.spyOn(matrixChatConnection as never, "removeRoomFromAllFolders").mockResolvedValue(false);
            const handleOrphanRoom = vi
                .spyOn(
                    matrixChatConnection as unknown as { handleOrphanRoom: (room: unknown) => void },
                    "handleOrphanRoom"
                )
                .mockImplementation(() => undefined);

            matrixChatConnection["scheduleRoomPlacementReconciliation"](roomId);
            await vi.advanceTimersByTimeAsync(3000);

            expect(handleOrphanRoom).toHaveBeenCalledWith(room);
        });

        it("should remove an invalidated m.space.child from its parent folder and reschedule placement reconciliation", async () => {
            const roomId = "!child:server";
            const parentId = "!space:server";
            const staleRoom = { destroy: vi.fn() };
            const parentFolder = Object.assign(Object.create(MatrixRoomFolder.prototype), {
                id: parentId,
                roomList: new Map([[roomId, staleRoom]]),
                folderList: new Map(),
                deleteNode: vi.fn().mockResolvedValue(true),
            }) as MatrixRoomFolder & { deleteNode: ReturnType<typeof vi.fn> };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(true),
                on: vi.fn(),
                off: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
                getVisibleRooms: vi.fn().mockReturnValue([]),
                getRoom: vi.fn(),
            } as unknown as MatrixClient;

            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));
            matrixChatConnection["roomFolders"].set(parentId, parentFolder as never);
            const scheduleReconciliationSpy = vi.spyOn(
                matrixChatConnection as unknown as { scheduleRoomPlacementReconciliation: (id: string) => void },
                "scheduleRoomPlacementReconciliation"
            );

            const event = {
                getType: vi.fn().mockReturnValue(EventType.SpaceChild),
                getStateKey: vi.fn().mockReturnValue(roomId),
                getRoomId: vi.fn().mockReturnValue(parentId),
                getContent: vi.fn().mockReturnValue({}),
            };

            matrixChatConnection["onRoomStateEvent"](event as never);
            await flushPromises();

            expect(parentFolder.deleteNode).toHaveBeenCalledWith(roomId);
            expect(scheduleReconciliationSpy).toHaveBeenCalledWith(roomId);
        });

        it("should keep retrying room placement while reconciliation is pending", async () => {
            vi.useFakeTimers();
            const roomId = "!child:server";
            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(true),
                on: vi.fn(),
                off: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
                getVisibleRooms: vi.fn().mockReturnValue([]),
                getRoom: vi.fn(),
            } as unknown as MatrixClient;
            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));
            const reconcileRoomPlacement = vi.fn().mockResolvedValue("pending");
            matrixChatConnection["reconcileRoomPlacement"] = reconcileRoomPlacement as never;

            matrixChatConnection["scheduleRoomPlacementReconciliation"](roomId);
            await vi.advanceTimersByTimeAsync(100);

            expect(reconcileRoomPlacement).toHaveBeenCalledTimes(2);
        });

        it("should stop retrying room placement when reconciliation succeeds", async () => {
            vi.useFakeTimers();
            const roomId = "!child:server";
            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(true),
                on: vi.fn(),
                off: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
                getVisibleRooms: vi.fn().mockReturnValue([]),
                getRoom: vi.fn(),
            } as unknown as MatrixClient;
            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));
            const reconcileRoomPlacement = vi.fn().mockResolvedValue("placed");
            matrixChatConnection["reconcileRoomPlacement"] = reconcileRoomPlacement as never;

            matrixChatConnection["scheduleRoomPlacementReconciliation"](roomId);
            await vi.advanceTimersByTimeAsync(1600);

            expect(reconcileRoomPlacement).toHaveBeenCalledOnce();
        });

        it("should not recreate a placement retry timer when an old reconciliation resolves after cleanup", async () => {
            vi.useFakeTimers();
            const roomId = "!child:server";
            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(true),
                on: vi.fn(),
                off: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
                getVisibleRooms: vi.fn().mockReturnValue([]),
                getRoom: vi.fn(),
            } as unknown as MatrixClient;
            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));
            let resolveReconciliation: (result: "pending") => void = () => undefined;
            matrixChatConnection["reconcileRoomPlacement"] = vi.fn().mockReturnValue(
                new Promise((resolve) => {
                    resolveReconciliation = resolve;
                })
            ) as never;

            matrixChatConnection["scheduleRoomPlacementReconciliation"](roomId);
            matrixChatConnection["clearRoomPlacementRetry"](roomId);
            resolveReconciliation("pending");
            await vi.advanceTimersByTimeAsync(1600);

            expect(matrixChatConnection["roomPlacementRetryTimers"].has(roomId)).toBeFalsy();
            expect(matrixChatConnection["reconcileRoomPlacement"]).toHaveBeenCalledOnce();
        });

        it("should keep root room when m.space.child event has no via", async () => {
            const roomId = "!child:server";
            const parentId = "!space:server";
            const matrixRoom = {
                roomId,
                isSpaceRoom: vi.fn().mockReturnValue(false),
                getMyMembership: vi.fn().mockReturnValue(KnownMembership.Join),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(true),
                on: vi.fn(),
                off: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
                getVisibleRooms: vi.fn().mockReturnValue([]),
                getRoom: vi.fn().mockImplementation((id: string) => (id === roomId ? matrixRoom : undefined)),
            } as unknown as MatrixClient;

            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));
            const rootRoom = { id: roomId, destroy: vi.fn() } as unknown as MatrixChatRoom;
            matrixChatConnection["roomList"].set(roomId, rootRoom);

            const event = {
                getType: vi.fn().mockReturnValue(EventType.SpaceChild),
                getStateKey: vi.fn().mockReturnValue(roomId),
                getRoomId: vi.fn().mockReturnValue(parentId),
                getContent: vi.fn().mockReturnValue({}),
            };

            matrixChatConnection["onRoomStateEvent"](event as never);

            expect(matrixChatConnection["roomList"].has(roomId)).toBeTruthy();
        });

        it("should keep root room when parent folder is not found", async () => {
            const roomId = "!child:server";
            const parentId = "!space:server";
            const matrixRoom = {
                roomId,
                isSpaceRoom: vi.fn().mockReturnValue(false),
                getMyMembership: vi.fn().mockReturnValue(KnownMembership.Join),
            };

            const mockMatrixClient = {
                isGuest: vi.fn().mockReturnValue(true),
                on: vi.fn(),
                off: vi.fn(),
                store: {
                    startup: vi.fn(),
                },
                initRustCrypto: vi.fn(),
                startClient: vi.fn(),
                isInitialSyncComplete: vi.fn().mockReturnValue(true),
                getVisibleRooms: vi.fn().mockReturnValue([]),
                getRoom: vi.fn().mockImplementation((id: string) => (id === roomId ? matrixRoom : undefined)),
            } as unknown as MatrixClient;

            const matrixChatConnection = await getMatrixConnection(Promise.resolve(mockMatrixClient));
            const rootRoom = { id: roomId, destroy: vi.fn() } as unknown as MatrixChatRoom;
            matrixChatConnection["roomList"].set(roomId, rootRoom);
            const scheduleReconciliationSpy = vi.spyOn(
                matrixChatConnection as unknown as { scheduleRoomPlacementReconciliation: (id: string) => void },
                "scheduleRoomPlacementReconciliation"
            );

            const event = {
                getType: vi.fn().mockReturnValue(EventType.SpaceChild),
                getStateKey: vi.fn().mockReturnValue(roomId),
                getRoomId: vi.fn().mockReturnValue(parentId),
                getContent: vi.fn().mockReturnValue({ via: ["server"] }),
            };

            matrixChatConnection["onRoomStateEvent"](event as never);
            await flushPromises();

            expect(matrixChatConnection["roomList"].has(roomId)).toBeTruthy();
            expect(scheduleReconciliationSpy).toHaveBeenCalledWith(roomId);
        });

        it("should init existing nested folder when adding a space child", async () => {
            const roomId = "!child-space:server";
            const existingChildFolder = {
                refreshRooms: vi.fn().mockResolvedValue(undefined),
                init: vi.fn(),
            };
            const folderList = {
                get: vi.fn().mockReturnValue(existingChildFolder),
                set: vi.fn(),
            };
            const parentFolder = {
                folderList,
                roomList: new Map(),
                myMembership: readable(KnownMembership.Invite),
            };
            const spaceRoom = {
                roomId,
                isSpaceRoom: vi.fn().mockReturnValue(true),
            };

            const matrixChatConnection = await getMatrixConnection(
                Promise.resolve({ isGuest: vi.fn().mockReturnValue(true) } as unknown as MatrixClient)
            );
            matrixChatConnection["roomFolders"].set(roomId, { id: roomId, destroy: vi.fn() } as never);

            await matrixChatConnection["addRoomToParentFolder"](spaceRoom as never, parentFolder as never);

            expect(existingChildFolder.refreshRooms).toHaveBeenCalledOnce();
            expect(existingChildFolder.init).toHaveBeenCalledOnce();
        });
    });
});
