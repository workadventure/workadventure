import { ClientEvent, MatrixClient, PendingEventOrdering, RoomEvent, EventType, SyncState } from "matrix-js-sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { KnownMembership } from "matrix-js-sdk/lib/types";
import { Writable, get, writable } from "svelte/store";
import { AvailabilityStatus, PartialSpaceUser } from "@workadventure/messages";
import { MatrixChatConnection } from "../MatrixChatConnection";
import { ChatUser, Connection, CreateRoomOptions } from "../../ChatConnection";
import { MatrixChatRoom } from "../MatrixChatRoom";
import { MatrixSecurity } from "../MatrixSecurity";

describe("MatrixChatConnection", () => {
    const flushPromises = () => new Promise(setImmediate);

    const basicMockConnection: Connection = {
        queryChatMembers: vi.fn(),
    };
    const basicMockMatrixSecurity = {
        isEncryptionRequiredAndNotSet: false,
    } as unknown as MatrixSecurity;

    describe("Constructor", () => {
        const directChatRoom = {
            id: "directChatRoom",
            type: "direct",
            myMembership: KnownMembership.Join,
        } as unknown as MatrixChatRoom;
        const InviteDirectChatRoom = {
            id: "InviteDirectChatRoom",
            type: "direct",
            myMembership: KnownMembership.Invite,
        } as unknown as MatrixChatRoom;
        const multipleChatRoom = {
            id: "multipleChatRoom",
            type: "multiple",
            myMembership: KnownMembership.Join,
        } as unknown as MatrixChatRoom;
        const InviteMultipleChatRoom = {
            id: "InviteMultipleChatRoom",
            type: "multiple",
            myMembership: KnownMembership.Invite,
        } as unknown as MatrixChatRoom;

        beforeAll(() => {
            vi.restoreAllMocks();
        });

        it("should contains all room with type direct and KnownMembership = join from roomList in directRooms", () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);
            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
        it("should contains all room with type multiple and KnownMembership = join from roomList in rooms", () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);
            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
        it("should contains all room with KnownMembership = invite from roomList in invitations", () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);
            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
        it("should set isEncryptionRequiredAndNotSet with value of isEncryptionRequiredAndNotSet from matrixSecurity", () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const mockMatrixSecurity = {
                isEncryptionRequiredAndNotSet: false,
            } as unknown as MatrixSecurity;

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                mockMatrixSecurity
            );

            expect(matrixChatConnection["isEncryptionRequiredAndNotSet"]).toBe(
                mockMatrixSecurity.isEncryptionRequiredAndNotSet
            );
        });
        it.each([[true], [false]])(
            "should set isEncryptionRequiredAndNotSet with value of isEncryptionRequiredAndNotSet from matrixSecurity ",
            (expected) => {
                const mockMatrixClient = {} as unknown as MatrixClient;

                const clientPromise = Promise.resolve(mockMatrixClient);

                const mockMatrixSecurity = {
                    isEncryptionRequiredAndNotSet: expected,
                } as unknown as MatrixSecurity;

                const matrixChatConnection = new MatrixChatConnection(
                    basicMockConnection,
                    clientPromise,
                    mockMatrixSecurity
                );

                expect(matrixChatConnection["isEncryptionRequiredAndNotSet"]).toBe(expected);
            }
        );

        it("should call startMatrixClient when client promise resolve", () => {
            const mockMatrixClient = {} as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const startMatrixClientSpy = vi.spyOn(MatrixChatConnection.prototype, "startMatrixClient");

            new MatrixChatConnection(basicMockConnection, clientPromise, basicMockMatrixSecurity);

            clientPromise
                .then(() => {
                    expect(startMatrixClientSpy).toHaveBeenCalledOnce();
                })
                .catch((e) => console.log(e));
        });
        it("should not call startMatrixClient when client promise reject", () => {
            const clientPromise = Promise.reject(new Error(""));

            const startMatrixClientSpy = vi.spyOn(MatrixChatConnection.prototype, "startMatrixClient");

            new MatrixChatConnection(basicMockConnection, clientPromise, basicMockMatrixSecurity);

            clientPromise.catch(() => {
                expect(startMatrixClientSpy).not.toHaveBeenCalled();
            });
        });

        it.each([[true], [false]])(
            "should set isGuest with value of isGuest from matrixClient when client promise resolve",
            async (expected) => {
                const mockMatrixClient = {
                    isGuest: vi.fn().mockReturnValue(expected),
                    on: vi.fn(),
                    store: {
                        startup: vi.fn(),
                    },
                    initRustCrypto: vi.fn(),
                    startClient: vi.fn(),
                } as unknown as MatrixClient;

                const clientPromise = Promise.resolve(mockMatrixClient);

                const matrixChatConnection = new MatrixChatConnection(
                    basicMockConnection,
                    clientPromise,
                    basicMockMatrixSecurity
                );

                await flushPromises();
                expect(get(matrixChatConnection.isGuest)).toBe(expected);
            }
        );
    });

    describe("startMatrixClient", () => {
        it.each([[ClientEvent.Sync], [ClientEvent.Room], [ClientEvent.DeleteRoom], [RoomEvent.MyMembership]])(
            "should call this.client.on for event %s",
            async (expectedEventName) => {
                const onMock = vi.fn();
                const mockMatrixClient = {
                    isGuest: vi.fn(),
                    on: onMock,
                    store: {
                        startup: vi.fn(),
                    },
                    initRustCrypto: vi.fn(),
                    startClient: vi.fn(),
                } as unknown as MatrixClient;

                const clientPromise = Promise.resolve(mockMatrixClient);

                const matrixChatConnection = new MatrixChatConnection(
                    basicMockConnection,
                    clientPromise,
                    basicMockMatrixSecurity
                );

                await clientPromise;

                onMock.mockRestore();
                await matrixChatConnection.startMatrixClient();

                expect(onMock).toHaveBeenCalledTimes(4);
                expect(onMock.mock.calls.some(([eventName, _]) => eventName === expectedEventName)).toBeTruthy();
            }
        );
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
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
            } as unknown as MatrixClient;

            const clientPromise = Promise.resolve(mockMatrixClient);

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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

    describe("updateUserFromSpace", () => {
        it("should not update userlist when user to update is not in userConnectedList", () => {
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            const userToUpdate = {
                id: 1,
            } as PartialSpaceUser;

            matrixChatConnection.updateUserFromSpace(userToUpdate);

            expect(matrixChatConnection["userConnected"]).toHaveLength(0);
        });
        it("should update availabilityStatus when is defined and !== 0", () => {
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            const userSpaceId = 1;

            const user = {
                spaceId: userSpaceId,
                name: "Alice",
                availabilityStatus: writable(3),
            } as unknown as ChatUser;

            matrixChatConnection["userConnected"].set(userSpaceId, user);

            const userToUpdate = {
                id: 1,
                availabilityStatus: 4,
            } as PartialSpaceUser;

            matrixChatConnection.updateUserFromSpace(userToUpdate);
            const availabilityStatusWritable: Writable<AvailabilityStatus> =
                matrixChatConnection["userConnected"].get(userSpaceId)?.availabilityStatus || writable(0);
            const availabilityStatus = get(availabilityStatusWritable);

            expect(availabilityStatus).toBe(userToUpdate.availabilityStatus);
        });

        it("should not update availabilityStatus when is defined and === 0", () => {
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            const initialAvailabilityStatus = 3;

            const userSpaceId = 1;
            const user = {
                spaceId: userSpaceId,
                name: "Alice",
                availabilityStatus: writable(initialAvailabilityStatus),
            } as unknown as ChatUser;

            matrixChatConnection["userConnected"].set(userSpaceId, user);

            const userToUpdate = {
                id: 1,
                availabilityStatus: 0,
            } as PartialSpaceUser;

            matrixChatConnection.updateUserFromSpace(userToUpdate);

            const availabilityStatusWritable: Writable<AvailabilityStatus> =
                matrixChatConnection["userConnected"].get(userSpaceId)?.availabilityStatus || writable(0);
            const availabilityStatus = get(availabilityStatusWritable);

            expect(availabilityStatus).toBe(initialAvailabilityStatus);
        });
    });
    describe("computeInitialState", () => {
        it("should add encryption option to initial state when encrypt from roomOptions is true", () => {
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            const roomOptions = {
                encrypt: true,
            };

            expect(matrixChatConnection["computeInitialState"](roomOptions)).toContainEqual({
                type: EventType.RoomEncryption,
                content: { algorithm: "m.megolm.v1.aes-sha2" },
            });
        });
        it("should not add encryption option to initial state when encrypt from roomOptions is false", () => {
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            const roomOptions = {
                encrypt: false,
            };

            expect(matrixChatConnection["computeInitialState"](roomOptions)).not.toContainEqual({
                type: EventType.RoomEncryption,
                content: { algorithm: "m.megolm.v1.aes-sha2" },
            });
        });
        it("should add historyVisibility option to initial state when historyVisibility from roomOptions is defined", () => {
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            const roomOptions = {
                historyVisibility: "joined",
            } as unknown as CreateRoomOptions;

            expect(matrixChatConnection["computeInitialState"](roomOptions)).toContainEqual({
                type: EventType.RoomHistoryVisibility,
                content: { history_visibility: roomOptions.historyVisibility },
            });
        });

        it("should not add historyVisibility option to initial state when historyVisibility from roomOptions is undefined", () => {
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            const roomOptions = {} as unknown as CreateRoomOptions;

            expect(matrixChatConnection["computeInitialState"](roomOptions)).toHaveLength(0);
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            //eslint-disable-next-line @typescript-eslint/no-floating-promises
            await expect(matrixChatConnection.createRoom()).rejects.toThrowError("CreateRoomOptions is empty");
        });

        it("should return client.createRoom Result when roomOptions is defined", async () => {
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            await clientPromise;

            expect(await matrixChatConnection.createRoom({})).toEqual(expected);
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
                on: vi.fn(),
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

            await clientPromise;

            const userId = "AliceID";

            const spyGetDirectRoomFor = vi.spyOn(matrixChatConnection, "getDirectRoomFor");
            spyGetDirectRoomFor.mockImplementation(() => undefined);

            matrixChatConnection["createRoom"] = vi.fn().mockResolvedValue({
                room_id: "newRoomId",
            });

            matrixChatConnection["addDMRoomInAccountData"] = vi.fn();

            await matrixChatConnection.createDirectRoom(userId);

            expect(matrixChatConnection["createRoom"]).toHaveBeenCalledOnce();
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
                on: vi.fn(),
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
                on: vi.fn(),
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
                on: vi.fn(),
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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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

            const matrixChatConnection = new MatrixChatConnection(
                basicMockConnection,
                clientPromise,
                basicMockMatrixSecurity
            );

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
});
