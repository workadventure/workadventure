import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { get, Writable, writable } from "svelte/store";
import { AtLeast } from "@workadventure/map-editor";
import { Filter, SpaceFilter, SpaceFilterInterface, SpaceUserExtended } from "../SpaceFilter/SpaceFilter";
import { RoomConnection } from "../../Connection/RoomConnection";

vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

vi.mock("../../Phaser/Game/GameManager", () => {
    return {
        gameManager: {
            getCurrentGameScene: () => ({}),
        },
    };
});

const defaultRoomConnectionMock = {
    emitUserJoinSpace: vi.fn(),
    emitAddSpaceFilter: vi.fn(),
} as unknown as RoomConnection;

describe("SpaceFilter", () => {
    describe("userExist", () => {
        it("should return false if user does not exist", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";
            const user: AtLeast<SpaceUserExtended, "id"> = {
                id: 0,
                name: "",
                playUri: "",
                color: "",
                characterTextures: [],
                isLogged: false,
                availabilityStatus: 0,
                roomName: undefined,
                visitCardUrl: undefined,
                tags: [],
                cameraState: false,
                microphoneState: false,
                screenSharingState: false,
                megaphoneState: false,
                jitsiParticipantId: undefined,
                uuid: "",
            };

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(
                new Map<number, SpaceUserExtended>([[user.id ?? 0, user as SpaceUserExtended]])
            );

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(
                spaceFilterName,
                spaceName,
                defaultRoomConnectionMock,
                undefined,
                userMap
            );

            const result = spaceFilter.userExist(user.id);

            expect(result).toBeTruthy();
        });
        it("should return true if user exist in list ", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";
            const user: Pick<SpaceUser, "id"> = {
                id: 0,
            };

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(
                spaceFilterName,
                spaceName,
                defaultRoomConnectionMock
            );

            const result = spaceFilter.userExist(user.id);

            expect(result).toBeFalsy();
        });
    });
    describe("addUser", () => {
        //not throw a error because this function is call when you receive a message by the pusher
        it("should add user when user is not exist in list  ", async () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";
            const id = 0;
            const user: Pick<SpaceUserExtended, "id"> = {
                id,
            };

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(
                spaceFilterName,
                spaceName,
                defaultRoomConnectionMock,
                undefined
            );
            await spaceFilter.addUser(user as SpaceUserExtended);
            expect(get(spaceFilter.users).has(user.id)).toBeTruthy();
        });

        it("should not overwrite user when you add a new user and he already exist", async () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";
            const id = 0;
            const user: Pick<SpaceUserExtended, "id"> = {
                id,
            };

            const userWithSameID: Pick<SpaceUserExtended, "id" | "name"> = {
                id,
                name: "user-name",
            };

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(
                new Map<number, SpaceUserExtended>([[user.id, user as SpaceUserExtended]])
            );

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(
                spaceFilterName,
                spaceName,
                defaultRoomConnectionMock,
                undefined,
                userMap
            );
            await spaceFilter.addUser(userWithSameID as SpaceUser);

            const userInStore = get(spaceFilter.users).get(id);

            expect(userInStore?.id).toEqual(id);
            expect(userInStore?.name).toBeUndefined();
        });
    });
    describe("updateUserData", () => {
        it("should not update userdata when user object do not have id ", () => {
            const spaceFilterName = "space-name";
            const spaceName = "space-name";
            const id = 0;

            const user: Pick<SpaceUserExtended, "id" | "name"> = {
                id,
                name: "user-1",
            };

            const newData: Partial<SpaceUserExtended> = {
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            };

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(
                new Map<number, SpaceUserExtended>([[user.id, user as SpaceUserExtended]])
            );

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(
                spaceFilterName,
                spaceName,
                defaultRoomConnectionMock,
                undefined,
                userMap
            );

            spaceFilter.updateUserData(newData);

            expect(spaceFilter.getUser(id)).toStrictEqual(user);
        });
        it("should update user data when user object have a id ", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";
            const id = 0;

            const user: Pick<SpaceUserExtended, "id" | "name"> = {
                id,
                name: "user-1",
            };

            const newData: Partial<SpaceUserExtended> = {
                id,
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            };

            const updatedUserResult = {
                ...user,
                ...newData,
            };
            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(
                new Map<number, SpaceUserExtended>([[user.id, user as SpaceUserExtended]])
            );

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(
                spaceFilterName,
                spaceName,
                defaultRoomConnectionMock,
                undefined,
                userMap
            );

            spaceFilter.updateUserData(newData);

            const updatedUser = spaceFilter.getUser(id);

            expect(updatedUser).toStrictEqual(updatedUserResult);
        });
        it("should not update userdata when user object have a incorrect id ", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";
            const id = 0;

            const user: Pick<SpaceUserExtended, "id" | "name"> = {
                id,
                name: "user-1",
            };

            const newData: Partial<SpaceUser> = {
                id: 404,
                name: "user-2",
                availabilityStatus: 1,
                roomName: "world",
            };

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(
                new Map<number, SpaceUserExtended>([[user.id, user as SpaceUserExtended]])
            );

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(
                spaceFilterName,
                spaceName,
                defaultRoomConnectionMock,
                undefined,
                userMap
            );

            spaceFilter.updateUserData(newData);

            const updatedUser = spaceFilter.getUser(id);

            expect(updatedUser).toStrictEqual(user);
        });
    });

    describe("emitFilterEvent", () => {
        it("emit addSpaceFilter event when you create spaceFilter", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(new Map<number, SpaceUserExtended>([]));

            const mockRoomConnection = {
                emitAddSpaceFilter: vi.fn(),
                emitRemoveSpaceFilter: vi.fn(),
            } as unknown as RoomConnection;

            new SpaceFilter(spaceFilterName, spaceName, mockRoomConnection, undefined, userMap);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitAddSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitAddSpaceFilter).toHaveBeenCalledWith({
                spaceFilterMessage: {
                    filterName: spaceFilterName,
                    spaceName,
                },
            });
        });

        it("emit removeSpaceFilter event when you create spaceFilter", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(new Map<number, SpaceUserExtended>([]));

            const mockRoomConnection = {
                emitAddSpaceFilter: vi.fn(),
                emitRemoveSpaceFilter: vi.fn(),
            } as unknown as RoomConnection;

            const spaceFilter = new SpaceFilter(spaceFilterName, spaceName, mockRoomConnection, undefined, userMap);
            spaceFilter.destroy();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitRemoveSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitRemoveSpaceFilter).toHaveBeenLastCalledWith({
                spaceFilterMessage: {
                    filterName: spaceFilterName,
                    spaceName,
                },
            });
        });
        it("emit updateSpaceFilter event when you update spaceFilter", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(new Map<number, SpaceUserExtended>([]));

            const newFilter: Filter = {
                $case: "spaceFilterEverybody",
                spaceFilterEverybody: {},
            };

            const mockRoomConnection = {
                emitAddSpaceFilter: vi.fn(),
                emitUpdateSpaceFilter: vi.fn(),
            } as unknown as RoomConnection;

            const spaceFilter = new SpaceFilter(spaceFilterName, spaceName, mockRoomConnection, undefined, userMap);

            spaceFilter.setFilter(newFilter);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitUpdateSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockRoomConnection.emitUpdateSpaceFilter).toHaveBeenLastCalledWith({
                spaceFilterMessage: {
                    filterName: spaceFilterName,
                    spaceName,
                    filter: newFilter,
                },
            });
        });
    });
});
