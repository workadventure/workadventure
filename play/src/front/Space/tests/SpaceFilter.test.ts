import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { get, Writable, writable } from "svelte/store";
import { AtLeast } from "@workadventure/map-editor";
import { Filter, SpaceFilter, SpaceFilterInterface, SpaceUserExtended } from "../SpaceFilter/SpaceFilter";

vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

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
                undefined,
                vi.fn(),
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

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(spaceFilterName, spaceName, undefined, vi.fn());

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

            const spaceFilter: SpaceFilterInterface = new SpaceFilter(spaceFilterName, spaceName, undefined, vi.fn());
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
                undefined,
                vi.fn(),
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
                undefined,
                vi.fn(),

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
                undefined,
                vi.fn(),

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
                undefined,
                vi.fn(),
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

            const mockSender = vi.fn();

            new SpaceFilter(spaceFilterName, spaceName, undefined, mockSender, userMap);

            const message = {
                message: {
                    $case: "addSpaceFilterMessage",
                    addSpaceFilterMessage: {
                        spaceFilterMessage: {
                            filterName: spaceFilterName,
                            spaceName,
                        },
                    },
                },
            };

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockSender).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockSender).toHaveBeenCalledWith(message);
        });

        it("emit removeSpaceFilter event when you create spaceFilter", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(new Map<number, SpaceUserExtended>([]));

            const mockSender = vi.fn();
            const spaceFilter = new SpaceFilter(spaceFilterName, spaceName, undefined, mockSender, userMap);
            spaceFilter.destroy();

            const message = {
                message: {
                    $case: "removeSpaceFilterMessage",
                    removeSpaceFilterMessage: {
                        spaceFilterMessage: {
                            filterName: spaceFilterName,
                            spaceName,
                        },
                    },
                },
            };

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockSender).toHaveBeenCalledTimes(2);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockSender).toHaveBeenLastCalledWith(message);
        });
        it("emit updateSpaceFilter event when you update spaceFilter", () => {
            const spaceFilterName = "space-filter-name";
            const spaceName = "space-name";

            const userMap: Writable<Map<number, SpaceUserExtended>> = writable(new Map<number, SpaceUserExtended>([]));

            const newFilter: Filter = {
                $case: "spaceFilterEverybody",
                spaceFilterEverybody: {},
            };

            const mockSender = vi.fn();
            const spaceFilter = new SpaceFilter(spaceFilterName, spaceName, undefined, mockSender, userMap);

            spaceFilter.setFilter(newFilter);

            const message = {
                message: {
                    $case: "updateSpaceFilterMessage",
                    updateSpaceFilterMessage: {
                        spaceFilterMessage: {
                            filterName: spaceFilterName,
                            spaceName,
                            filter: newFilter,
                        },
                    },
                },
            };

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockSender).toHaveBeenCalledTimes(2);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockSender).toHaveBeenLastCalledWith(message);
        });
    });
});
