import { SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";
import { SpaceEventEmitterInterface } from "../SpaceEventEmitter/SpaceEventEmitterInterface";
import {
    SpaceFilterManagerInterface,
    SpaceManagerInterface,
    SpaceUserManagerInterface,
} from "../SpaceManager/SpaceManagerInterface";
import { SpaceManager } from "../SpaceManager/SpaceManager";
import { SpaceInterface } from "../SpaceInterface";
import {
    SpaceAlreadyExistError,
    SpaceDoesNotExistError,
    UserAlreadyExistInSpaceError,
    UserDoesNotExistInSpaceError,
} from "../Errors/SpaceError";

const basicSpaceUser: SpaceUser = {
    availabilityStatus: 0,
    cameraState: false,
    characterTextures: [],
    color: "",
    id: 0,
    isLogged: false,
    jitsiParticipantId: "",
    megaphoneState: false,
    microphoneState: false,
    name: "basicUser",
    playUri: "",
    roomName: "",
    screenSharingState: false,
    tags: [],
    uuid: "",
    visitCardUrl: "",
};

const basicFilter: Omit<SpaceFilterMessage, "spaceName"> = {
    filterName: "basic-filter-name",
    filter: {
        $case: "spaceFilterEverybody",
    },
};

let basicSpaceEventEmitter: SpaceEventEmitterInterface = {
    addSpaceFilter: vi.fn(),
    userJoinSpace: vi.fn(),
    userLeaveSpace: vi.fn(),
    updateSpaceMetadata: vi.fn(),
    updateSpaceFilter: vi.fn(),
    removeSpaceFilter: vi.fn(),
};

let basicSpaceProvider: SpaceProviderInterface = {
    getAll: vi.fn(),
    join: vi.fn(),
    add: vi.fn(),
    exist: vi.fn(),
    userExistInSpace: vi.fn(),
    delete: vi.fn(),
    updateMetadata: vi.fn(),
    addUserToSpace: vi.fn(),
    removeUserToSpace: vi.fn(),
    updateUserData: vi.fn(),
};

describe("Space Management", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        basicSpaceEventEmitter = {
            addSpaceFilter: vi.fn(),
            userJoinSpace: vi.fn(),
            userLeaveSpace: vi.fn(),
            updateSpaceMetadata: vi.fn(),
            updateSpaceFilter: vi.fn(),
            removeSpaceFilter: vi.fn(),
        };
        basicSpaceProvider = {
            getAll: vi.fn(),
            join: vi.fn(),
            add: vi.fn(),
            exist: vi.fn(),
            userExistInSpace: vi.fn(),
            delete: vi.fn(),
            updateMetadata: vi.fn(),
            addUserToSpace: vi.fn(),
            removeUserToSpace: vi.fn(),
            updateUserData: vi.fn(),
        };
    });
    describe("SpaceManager", () => {
        it("should return a list of spaces", () => {
            const basicSpaceProvider: SpaceProviderInterface = {
                getAll: vi.fn().mockImplementation(() => []),
            };
            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            const spaces: SpaceInterface[] = mySpaceManager.getAll();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.getAll).toHaveBeenCalledOnce();
            expect(spaces).toStrictEqual(basicSpaceProvider.getAll());
        });
        it("should create a SpaceManager with the list/store pass in parameter", () => {
            const mySpace: SpaceInterface = {
                getName(): string {
                    return "newSpaceName";
                },
            };

            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => [mySpace]);

            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            const spaces: SpaceInterface[] = mySpaceManager.getAll();

            expect(spaces).toStrictEqual(basicSpaceProvider.getAll());
        });
        it("should create a new space/add in basicSpaceProvider/emit join space event  when you join a new space ", () => {
            const spaces: SpaceInterface[] = [];

            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));

            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            const newSpaceName = "New-space";

            mySpaceManager.join(newSpaceName);

            //verify Store

            expect(mySpaceManager.getAll().length).toBe(1);
            expect(newSpaceName).toStrictEqual(basicSpaceProvider.getAll()[0].getName());

            //emit event

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.userJoinSpace).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.userJoinSpace).toHaveBeenCalledWith(newSpaceName, basicSpaceUser);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.addSpaceFilter).not.toHaveBeenCalled();
        });
        it("should create a new space/add in basicSpaceProvider/emit join space event/emit addFilter  when you join a new space with filter in param", () => {
            const spaces: SpaceInterface[] = [];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));

            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            const newSpaceName = "New-space";

            const newSpaceFilter: Omit<SpaceFilterMessage, "spaceName"> = {
                filterName: "test",
                filter: undefined,
            };

            mySpaceManager.join(newSpaceName, newSpaceFilter);

            //verify Store

            expect(mySpaceManager.getAll().length).toBe(1);
            expect(newSpaceName).toStrictEqual(basicSpaceProvider.getAll()[0].getName());

            //emit event

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.userJoinSpace).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.userJoinSpace).toHaveBeenCalledWith(newSpaceName, basicSpaceUser);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.addSpaceFilter).toHaveBeenCalledOnce();
        });
        it("should throw a error when you want to create a space but the spaceName already exist", () => {
            const spaces: SpaceInterface[] = [];

            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            const newSpaceName = "New-space";

            expect(() => {
                mySpaceManager.join(newSpaceName);
            }).toThrowError(SpaceAlreadyExistError);
        });
        it("should leave a space when space is in basicSpaceProvider", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];

            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            mySpaceManager.leave(newSpaceName);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.delete).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.delete).toHaveBeenCalledWith(newSpaceName);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.userLeaveSpace).toHaveBeenCalledOnce();
        });
        it("should throw a error when try to delete a space who is not in basicSpaceProvider", () => {
            const spaces: SpaceInterface[] = [];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => false);

            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            const newSpaceName = "New-space";

            expect(() => {
                mySpaceManager.leave(newSpaceName);
            }).toThrowError(SpaceDoesNotExistError);
        });
        it("should update metadata of space", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            const newMetadata = "newMetadata";
            mySpaceManager.updateMetadata(newSpaceName, newMetadata);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.updateMetadata).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.updateMetadata).toHaveBeenCalledWith(newSpaceName, newMetadata);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.updateSpaceMetadata).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.updateSpaceMetadata).toHaveBeenCalledWith(newSpaceName, newMetadata);
        });
        it("should return a error when you want to update a space who does not exist", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => false);

            const mySpaceManager: SpaceManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            const newMetadata = "newMetadata";

            expect(() => {
                mySpaceManager.updateMetadata(newSpaceName, newMetadata);
            }).toThrowError(SpaceDoesNotExistError);
        });
    });
    describe("SpaceUserManager", () => {
        it("should add a user to a specific Space", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];

            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => false);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            mySpaceManager.addUserToSpace(newSpaceName, basicSpaceUser);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.addUserToSpace).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.addUserToSpace).toHaveBeenCalledWith(newSpaceName, basicSpaceUser);
        });
        it("should return a error when you want to add a user who is already in space", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];

            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            expect(() => {
                mySpaceManager.addUserToSpace(newSpaceName, basicSpaceUser);
            }).toThrowError(UserAlreadyExistInSpaceError);
        });
        it("should return a error when you want to add a user in a space who does not exist", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => false);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            expect(() => {
                mySpaceManager.addUserToSpace(newSpaceName, basicSpaceUser);
            }).toThrowError(SpaceDoesNotExistError);
        });
        it("should delete a user to a specific Space", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];

            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            mySpaceManager.removeUserToSpace(newSpaceName, basicSpaceUser);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.removeUserToSpace).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.removeUserToSpace).toHaveBeenCalledWith(newSpaceName, basicSpaceUser);
        });
        it("should return a error when you want to remove a user who is not in space", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];

            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => false);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            expect(() => {
                mySpaceManager.removeUserToSpace(newSpaceName, basicSpaceUser);
            }).toThrowError(UserDoesNotExistInSpaceError);
        });
        it("should return a error when you want to remove a user in a space who does not exist", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => false);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            expect(() => {
                mySpaceManager.removeUserToSpace(newSpaceName, basicSpaceUser);
            }).toThrowError(SpaceDoesNotExistError);
        });
        it("should update a user data/information ", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            mySpaceManager.updateUserData(newSpaceName, basicSpaceUser);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.updateUserData).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceProvider.updateUserData).toHaveBeenCalledWith(newSpaceName, basicSpaceUser);
        });
        it("should return a error when you want to update user data of a user who is not in space", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => false);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            expect(() => {
                mySpaceManager.updateUserData(newSpaceName, basicSpaceUser);
            }).toThrowError(UserDoesNotExistInSpaceError);
        });
        it("should return a error when you want to update a user in a space who does not exist", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => false);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceUserManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );

            expect(() => {
                mySpaceManager.updateUserData(newSpaceName, basicSpaceUser);
            }).toThrowError(SpaceDoesNotExistError);
        });
    });
    describe("SpaceFilterManager", () => {
        it("should emit event with the new filter when you add a filter", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceFilterManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            mySpaceManager.addFilterToSpace(newSpaceName, basicFilter);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.addSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.addSpaceFilter).toHaveBeenCalledWith({
                ...basicFilter,
                spaceName: newSpaceName,
            });
        });
        it("should return a error when you want to add a filter to a space who does not exist", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => false);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceFilterManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            expect(() => {
                mySpaceManager.addFilterToSpace(newSpaceName, basicFilter);
            }).toThrowError(SpaceDoesNotExistError);
        });
        it("should emit event when you remove filter", () => {
            const newSpaceName = "new-space";
            const filterName = "new-filter-name";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceFilterManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            mySpaceManager.removeFilterToSpace(newSpaceName, filterName);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.removeSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.removeSpaceFilter).toHaveBeenCalledWith(newSpaceName, filterName);
        });
        it("should return a error when you want to remove a filter to a space who does not exist", () => {
            const newSpaceName = "New-space";

            const spaces: SpaceInterface[] = [
                {
                    getName(): string {
                        return newSpaceName;
                    },
                },
            ];
            basicSpaceProvider.getAll = vi.fn().mockImplementation(() => spaces);
            basicSpaceProvider.add = vi.fn().mockImplementation((newSpace) => spaces.push(newSpace));
            basicSpaceProvider.exist = vi.fn().mockImplementation(() => false);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceFilterManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            expect(() => {
                mySpaceManager.removeFilterToSpace(newSpaceName, basicFilter.filterName);
            }).toThrowError(SpaceDoesNotExistError);
        });
        it("should emit event when you update filter", () => {
            const spaceName = "new-space";

            basicSpaceProvider.exist = vi.fn().mockImplementation(() => true);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => true);

            const mySpaceManager: SpaceFilterManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            mySpaceManager.updateFilterOfSpace(spaceName, basicFilter);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.updateSpaceFilter).toHaveBeenCalledOnce();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(basicSpaceEventEmitter.updateSpaceFilter).toHaveBeenCalledWith({ ...basicFilter, spaceName });
        });
        it("should return a error when you want to update a filter to a space who does not exist", () => {
            const newSpaceName = "New-space";

            basicSpaceProvider.exist = vi.fn().mockImplementation(() => false);
            basicSpaceProvider.userExistInSpace = vi.fn().mockImplementation(() => false);

            const mySpaceManager: SpaceFilterManagerInterface = new SpaceManager(
                basicSpaceProvider,
                basicSpaceEventEmitter,
                basicSpaceUser
            );
            expect(() => {
                mySpaceManager.updateFilterOfSpace(newSpaceName, basicFilter);
            }).toThrowError(SpaceDoesNotExistError);
        });
    });
});
