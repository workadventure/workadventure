import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackToPusherSpaceMessage, FilterType, PrivateEvent, PublicEvent, SpaceUser } from "@workadventure/messages";
import { mock } from "vitest-mock-extended";
import { Space } from "../src/Model/Space";
import { SpacesWatcher } from "../src/Model/SpacesWatcher";

describe("Space with filter", () => {
    describe("addWatcher", () => {
        it("should send all users to the new watcher", () => {
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: () => true,
            });

            const space = new Space("test", FilterType.ALL_USERS);

            const spaceUser1: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
            });
            const spaceUser2: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_2",
                uuid: "uuid-test2",
            });

            const spaceUser3: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_3",
                uuid: "uuid-test3",
            });

            //TODO : instead of using the private property, we could use dependency injection to set the users
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([
                    ["foo_1", spaceUser1],
                    ["foo_2", spaceUser2],
                    ["foo_3", spaceUser3],
                ])
            );

            const writeFunctionMock = vi.fn();

            const watcherToAdd = mock<SpacesWatcher>({
                id: "uuid-watcher-to-add",
                write: writeFunctionMock,
            });
            space.addWatcher(watcherToAdd);

            expect(writeFunctionMock).toHaveBeenCalledTimes(4);

            expect(writeFunctionMock).toHaveBeenNthCalledWith(
                1,
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: spaceUser1,
                        },
                    },
                })
            );

            expect(writeFunctionMock).toHaveBeenNthCalledWith(
                2,
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: spaceUser2,
                        },
                    },
                })
            );

            expect(writeFunctionMock).toHaveBeenNthCalledWith(
                3,
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: spaceUser3,
                        },
                    },
                })
            );

            expect(writeFunctionMock).toHaveBeenNthCalledWith(
                4,
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({}),
                        },
                    },
                })
            );
        });

        it.skip("should throw error if watcher is already added ???", () => {
            expect(true).toBeFalsy();
        });
    });
    describe("addUser", () => {
        it("should send user to the watcher if result of filter is true", () => {
            const space = new Space("test", FilterType.ALL_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.addUser(watcher, spaceUser);

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: spaceUser,
                        },
                    },
                })
            );

            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: spaceUser,
                        },
                    },
                })
            );
        });
        it("should not send user to the watcher if result of filter is false", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.addUser(watcher, spaceUser);

            expect(mockWriteFunction).toHaveBeenCalledTimes(0);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(0);
        });
        it.skip("should send remove user event if a error occurs ???", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn().mockImplementation(() => {
                throw new Error("test");
            });
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.addUser(watcher, spaceUser);

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(0);
        });
    });

    describe("updateUser", () => {
        it("should send add user message when user is updated and the filter result becomes true and the user did not previously match the filter", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
                megaphoneState: false,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.updateUser(
                watcher,
                {
                    ...spaceUser,
                    megaphoneState: true,
                },
                ["megaphoneState"]
            );

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: {
                                ...spaceUser,
                                megaphoneState: true,
                            },
                        },
                    },
                })
            );

            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: {
                            spaceName: "test",
                            user: {
                                ...spaceUser,
                                megaphoneState: true,
                            },
                        },
                    },
                })
            );
        });
        it("should send update user message when user is updated and the filter result remains true and the user already matched the filter", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
                megaphoneState: true,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.updateUser(
                watcher,
                {
                    ...spaceUser,
                    megaphoneState: true,
                    name: "test2",
                    cameraState: true,
                },
                ["megaphoneState", "name", "cameraState"]
            );

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceUserMessage",
                        updateSpaceUserMessage: {
                            spaceName: "test",
                            user: {
                                ...spaceUser,
                                megaphoneState: true,
                                name: "test2",
                                cameraState: true,
                            },
                            updateMask: ["megaphoneState", "name", "cameraState"],
                        },
                    },
                })
            );

            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceUserMessage",
                        updateSpaceUserMessage: {
                            spaceName: "test",
                            user: {
                                ...spaceUser,
                                megaphoneState: true,
                                name: "test2",
                                cameraState: true,
                            },
                            updateMask: ["megaphoneState", "name", "cameraState"],
                        },
                    },
                })
            );
        });
        it("should send delete user message when user is updated and the filter result becomes false and the user previously matched the filter", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
                megaphoneState: true,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.updateUser(
                watcher,
                {
                    ...spaceUser,
                    megaphoneState: false,
                },
                ["megaphoneState"]
            );

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: {
                            spaceName: "test",
                            spaceUserId: "foo_1",
                        },
                    },
                })
            );

            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: {
                            spaceName: "test",
                            spaceUserId: "foo_1",
                        },
                    },
                })
            );
        });
        it("should not send anything when user is updated and the filter result remains false and the user did not previously match the filter", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
                megaphoneState: false,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.updateUser(
                watcher,
                {
                    ...spaceUser,
                    megaphoneState: false,
                },
                ["megaphoneState"]
            );

            expect(mockWriteFunction).toHaveBeenCalledTimes(0);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(0);
        });

        it("should not send anything when user is not found on watcher list", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
                megaphoneState: false,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.updateUser(
                watcher,
                {
                    ...spaceUser,
                    megaphoneState: false,
                },
                ["megaphoneState"]
            );

            expect(mockWriteFunction).toHaveBeenCalledTimes(0);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(0);
        });
    });

    describe("removeUser", () => {
        it("should send remove user message to all watchers when user is removed and the filter result remains true", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
                megaphoneState: true,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );

            space.removeUser(watcher, "foo_1");

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: {
                            spaceName: "test",
                            spaceUserId: "foo_1",
                        },
                    },
                })
            );
        });

        it("should send remove user message to all watchers when user is removed and the filter result remains true", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
                megaphoneState: true,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([
                    ["foo_1", spaceUser],
                    ["foo_2", spaceUser],
                ])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );

            space.removeUser(watcher, "foo_1");

            // watcher1 should not have received the event because it no longer has any users in its list
            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: {
                            spaceName: "test",
                            spaceUserId: "foo_1",
                        },
                    },
                })
            );

            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: {
                            spaceName: "test",
                            spaceUserId: "foo_1",
                        },
                    },
                })
            );
        });
        it("shouldn't send remove user message to all watchers when user is removed and the filter result becomes false", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([
                    ["foo_1", spaceUser],
                    ["foo_2", spaceUser],
                ])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );

            space.removeUser(watcher, "foo_1");

            // watcher1 should not have received the event because it no longer has any users in its list
            expect(mockWriteFunction).not.toHaveBeenCalled();
            expect(mockWriteFunction2).not.toHaveBeenCalled();
        });
    });

    describe("updateMetadata", () => {
        it("should send update metadata message to all watchers", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.updateMetadata(watcher, {
                foo: "bar",
            });

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({
                                foo: "bar",
                            }),
                        },
                    },
                })
            );

            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({
                                foo: "bar",
                            }),
                        },
                    },
                })
            );
        });
        it("should send update metadata message to all watchers", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.updateMetadata(watcher, {});

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({}),
                        },
                    },
                })
            );

            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({}),
                        },
                    },
                })
            );
        });
    });

    describe("dispatchPublicEvent", () => {
        it("should send public event to all watchers", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.dispatchPublicEvent(
                PublicEvent.fromPartial({
                    spaceName: "test",
                })
            );

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "publicEvent",
                        publicEvent: {
                            spaceName: "test",
                        },
                    },
                })
            );

            expect(mockWriteFunction2).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "publicEvent",
                        publicEvent: {
                            spaceName: "test",
                        },
                    },
                })
            );
        });
    });

    describe("dispatchPrivateEvent", () => {
        it("should send private event to the watcher that contains the user", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            const mockWriteFunction2 = vi.fn();
            const watcher2 = mock<SpacesWatcher>({
                id: "uuid-watcher-2",
                write: mockWriteFunction2,
            });

            const spaceUser: SpaceUser = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", spaceUser]])
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );

            space.dispatchPrivateEvent(
                PrivateEvent.fromPartial({
                    spaceName: "test",
                    receiverUserId: "foo_1",
                })
            );

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(0);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "privateEvent",
                        privateEvent: {
                            spaceName: "test",
                            receiverUserId: "foo_1",
                        },
                    },
                })
            );
        });
    });

    describe("canBeDeleted", () => {
        it("should return true if the space has no users", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            expect(space.canBeDeleted()).toBe(true);
        });
        it("should return false if the space has users", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS);
            const mockWriteFunction = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: mockWriteFunction,
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([])
            );
            expect(space.canBeDeleted()).toBe(false);
        });
    });

    describe("syncAndDiffAsPrivateEvents", () => {
        let space: Space;
        let watcher: SpacesWatcher;
        const senderUserId = "test_sender_123";

        beforeEach(() => {
            space = new Space("test", FilterType.ALL_USERS);
            watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: vi.fn(),
            });
        });

        describe("when client is missing users (ADD events)", () => {
            it("should generate ADD PrivateEvent for missing user", () => {
                const localUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    uuid: "uuid-1",
                    name: "Local User",
                    microphoneState: true,
                    megaphoneState: false,
                });

                // Setup: server has one user, client provides empty list
                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([["user_1", localUser]])
                );

                const providedUsers: SpaceUser[] = [];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(1);
                expect(events[0].message?.$case).toBe("privateEvent");

                if (events[0].message?.$case === "privateEvent") {
                    const privateEvent = events[0].message.privateEvent;
                    expect(privateEvent.spaceName).toBe("test");
                    expect(privateEvent.receiverUserId).toBe(senderUserId);
                    expect(privateEvent.senderUserId).toBe(senderUserId);
                    expect(privateEvent.spaceEvent?.event?.$case).toBe("addSpaceUserMessage");
                }
            });

            it("should generate ADD events for multiple missing users", () => {
                const user1: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "User 1",
                    megaphoneState: false,
                });

                const user2: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_2",
                    name: "User 2",
                    megaphoneState: false,
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([
                        ["user_1", user1],
                        ["user_2", user2],
                    ])
                );

                const providedUsers: SpaceUser[] = [];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(2);
                events.forEach((event) => {
                    expect(event.message?.$case).toBe("privateEvent");
                });
            });

            it("should NOT generate ADD event for filtered out user", () => {
                const space = new Space("test", FilterType.LIVE_STREAMING_USERS);

                const nonStreamingUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "Non Streaming User",
                    megaphoneState: false, // This will be filtered out
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([["user_1", nonStreamingUser]])
                );

                const providedUsers: SpaceUser[] = [];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(0);
            });
        });

        describe("when client has extra users (REMOVE events)", () => {
            it("should generate REMOVE PrivateEvent for extra user", () => {
                const extraUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "extra_user",
                    name: "Extra User",
                    megaphoneState: false,
                });

                // Setup: server has no users, client provides one user
                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map()
                );

                const providedUsers: SpaceUser[] = [extraUser];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(1);
                expect(events[0].message?.$case).toBe("privateEvent");

                if (events[0].message?.$case === "privateEvent") {
                    const privateEvent = events[0].message.privateEvent;
                    expect(privateEvent.spaceName).toBe("test");
                    expect(privateEvent.receiverUserId).toBe(senderUserId);
                    expect(privateEvent.senderUserId).toBe(senderUserId);
                    expect(privateEvent.spaceEvent?.event?.$case).toBe("removeSpaceUserMessage");
                }
            });

            it("should generate REMOVE events for multiple extra users", () => {
                const extraUser1: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "extra_1",
                    megaphoneState: false,
                });

                const extraUser2: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "extra_2",
                    megaphoneState: false,
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map()
                );

                const providedUsers: SpaceUser[] = [extraUser1, extraUser2];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(2);
                events.forEach((event) => {
                    expect(event.message?.$case).toBe("privateEvent");
                    if (event.message?.$case === "privateEvent") {
                        expect(event.message.privateEvent.spaceEvent?.event?.$case).toBe("removeSpaceUserMessage");
                    }
                });
            });
        });

        describe("when users exist on both sides but differ (UPDATE events)", () => {
            it("should generate UPDATE PrivateEvent when user data differs", () => {
                const localUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "Updated Name",
                    microphoneState: true,
                    megaphoneState: false,
                });

                const providedUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "Old Name",
                    microphoneState: false,
                    megaphoneState: false,
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([["user_1", localUser]])
                );

                const providedUsers: SpaceUser[] = [providedUser];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(1);
                expect(events[0].message?.$case).toBe("privateEvent");

                if (events[0].message?.$case === "privateEvent") {
                    const privateEvent = events[0].message.privateEvent;
                    expect(privateEvent.spaceEvent?.event?.$case).toBe("updateSpaceUserMessage");
                }
            });

            it("should generate UPDATE PrivateEvent for complex field changes", () => {
                const localUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    characterTextures: [
                        { id: "texture1", url: "updated_url1" },
                        { id: "texture2", url: "url2" },
                    ],
                    megaphoneState: false,
                });

                const providedUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    characterTextures: [
                        { id: "texture1", url: "old_url1" },
                        { id: "texture2", url: "url2" },
                    ],
                    megaphoneState: false,
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([["user_1", localUser]])
                );

                const providedUsers: SpaceUser[] = [providedUser];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(1);
                if (events[0].message?.$case === "privateEvent") {
                    expect(events[0].message.privateEvent.spaceEvent?.event?.$case).toBe("updateSpaceUserMessage");
                }
            });
        });

        describe("filter transitions (visibility changes)", () => {
            it("should generate ADD when user becomes visible due to filter change", () => {
                const space = new Space("test", FilterType.LIVE_STREAMING_USERS);

                const localUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "User",
                    megaphoneState: true, // Now visible (streaming)
                });

                const providedUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "User",
                    megaphoneState: false, // Was not visible
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([["user_1", localUser]])
                );

                const providedUsers: SpaceUser[] = [providedUser];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(1);
                if (events[0].message?.$case === "privateEvent") {
                    expect(events[0].message.privateEvent.spaceEvent?.event?.$case).toBe("addSpaceUserMessage");
                }
            });

            it("should generate REMOVE when user becomes invisible due to filter change", () => {
                const space = new Space("test", FilterType.LIVE_STREAMING_USERS);

                const localUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "User",
                    megaphoneState: false, // No longer visible
                });

                const providedUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "User",
                    megaphoneState: true, // Was visible
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([["user_1", localUser]])
                );

                const providedUsers: SpaceUser[] = [providedUser];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(1);
                if (events[0].message?.$case === "privateEvent") {
                    expect(events[0].message.privateEvent.spaceEvent?.event?.$case).toBe("removeSpaceUserMessage");
                }
            });
        });

        describe("when everything is in sync", () => {
            it("should generate no events when client and server are identical", () => {
                const user: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "Same User",
                    microphoneState: true,
                    characterTextures: [{ id: "texture1", url: "url1" }],
                    megaphoneState: false,
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([["user_1", user]])
                );

                const providedUsers: SpaceUser[] = [user];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(0);
            });

            it("should generate no events for empty user lists", () => {
                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map()
                );

                const providedUsers: SpaceUser[] = [];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(0);
            });
        });

        describe("complex scenarios", () => {
            it("should handle mixed operations (ADD, REMOVE, UPDATE) in one sync", () => {
                // Local state: user_1 (updated), user_2 (to be sent to client)
                const localUser1: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "Updated User 1",
                    megaphoneState: false,
                });

                const localUser2: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_2",
                    name: "User 2",
                    megaphoneState: false,
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([
                        ["user_1", localUser1],
                        ["user_2", localUser2],
                    ])
                );

                // Client state: user_1 (old data), user_3 (extra user)
                const providedUser1: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "Old User 1",
                    megaphoneState: false,
                });

                const providedUser3: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_3",
                    name: "Extra User 3",
                    megaphoneState: false,
                });

                const providedUsers: SpaceUser[] = [providedUser1, providedUser3];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(3);

                // Should have: UPDATE for user_1, ADD for user_2, REMOVE for user_3
                const eventTypes = events.map((event) => {
                    if (event.message?.$case === "privateEvent") {
                        return event.message.privateEvent.spaceEvent?.event?.$case;
                    }
                    return null;
                });

                expect(eventTypes).toContain("updateSpaceUserMessage");
                expect(eventTypes).toContain("addSpaceUserMessage");
                expect(eventTypes).toContain("removeSpaceUserMessage");
            });

            it("should respect filter type consistently", () => {
                const space = new Space("test", FilterType.LIVE_STREAMING_USERS);

                const streamingUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "streaming_user",
                    megaphoneState: true, // Visible with LIVE_STREAMING_USERS filter
                });

                const nonStreamingUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "non_streaming_user",
                    megaphoneState: false, // Not visible with LIVE_STREAMING_USERS filter
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([
                        ["streaming_user", streamingUser],
                        ["non_streaming_user", nonStreamingUser],
                    ])
                );

                const providedUsers: SpaceUser[] = [];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                // Should only generate ADD event for streaming user, not for non-streaming user
                expect(events).toHaveLength(1);
                if (events[0].message?.$case === "privateEvent") {
                    expect(events[0].message.privateEvent.spaceEvent?.event?.$case).toBe("addSpaceUserMessage");
                }
            });
        });

        describe("edge cases", () => {
            it("should handle users with undefined fields", () => {
                const localUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "User",
                    chatID: undefined,
                    visitCardUrl: undefined,
                    megaphoneState: false,
                });

                const providedUser: SpaceUser = SpaceUser.fromPartial({
                    spaceUserId: "user_1",
                    name: "User",
                    chatID: "some_chat_id",
                    visitCardUrl: "http://visit.card",
                    megaphoneState: false,
                });

                (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                    watcher,
                    new Map([["user_1", localUser]])
                );

                const providedUsers: SpaceUser[] = [providedUser];
                const events = space.syncAndDiffAsPrivateEvents(watcher, providedUsers, senderUserId);

                expect(events).toHaveLength(1);
                if (events[0].message?.$case === "privateEvent") {
                    expect(events[0].message.privateEvent.spaceEvent?.event?.$case).toBe("updateSpaceUserMessage");
                }
            });
        });
    });
});
