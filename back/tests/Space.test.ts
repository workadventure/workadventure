import { describe, expect, it, vi } from "vitest";
import { BackToPusherSpaceMessage, FilterType, PrivateEvent, PublicEvent, SpaceUser } from "@workadventure/messages";
import { mock } from "vitest-mock-extended";
import { Space } from "../src/Model/Space";
import type { SpacesWatcher } from "../src/Model/SpacesWatcher";
import type { EventProcessor } from "../src/Model/EventProcessor";

describe("Space with filter", () => {
    describe("addWatcher", () => {
        it("should send all users to the new watcher", () => {
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write: () => true,
            });

            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");

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

            expect(writeFunctionMock).toHaveBeenCalledTimes(1);

            expect(writeFunctionMock).toHaveBeenNthCalledWith(
                1,
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "initSpaceUsersMessage",
                        initSpaceUsersMessage: {
                            spaceName: "test",
                            users: [spaceUser1, spaceUser2, spaceUser3],
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
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            // Initialize usersToNotify maps needed by removeUser
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher,
                new Map<string, SpaceUser>([
                    ["foo_1", spaceUser],
                    ["foo_2", spaceUser],
                ])
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            // Initialize usersToNotify maps needed by removeUser
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher,
                new Map<string, SpaceUser>([
                    ["foo_1", spaceUser],
                    ["foo_2", spaceUser],
                ])
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
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
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
            // Initialize usersToNotify maps needed by removeUser
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher,
                new Map<string, SpaceUser>([
                    ["foo_1", spaceUser],
                    ["foo_2", spaceUser],
                ])
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
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
        it("should send update metadata message to all watchers", async () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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

            await space.updateMetadata(
                {
                    foo: "bar",
                },
                "senderId"
            );

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
        it("should send update metadata message to all watchers", async () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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

            await space.updateMetadata(
                {
                    "metadata-1": "value-1",
                },
                "senderId"
            );

            expect(mockWriteFunction).toHaveBeenCalledTimes(1);
            expect(mockWriteFunction2).toHaveBeenCalledTimes(1);

            expect(mockWriteFunction).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({
                                "metadata-1": "value-1",
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
                                "metadata-1": "value-1",
                            }),
                        },
                    },
                })
            );
        });

        it("should accept recording metadata without recorder when starting a recording", async () => {
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
            const write = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write,
            });
            const user = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", user]])
            );

            const startRecordingSpy = vi.spyOn(space, "startRecording").mockResolvedValue(undefined);
            vi.spyOn(space, "getRecordingState").mockReturnValue({
                isRecording: true,
                recorder: "foo_1",
            });

            await space.updateMetadata(
                {
                    recording: {
                        recording: true,
                    },
                },
                "foo_1"
            );

            expect(startRecordingSpy).toHaveBeenCalledWith(user);
            expect(write).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({
                                recording: {
                                    recorder: "foo_1",
                                    recording: true,
                                },
                            }),
                        },
                    },
                })
            );
        });

        it("should accept recording metadata without recorder when stopping a recording", async () => {
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
            const write = vi.fn();
            const watcher = mock<SpacesWatcher>({
                id: "uuid-watcher",
                write,
            });
            const user = SpaceUser.fromPartial({
                spaceUserId: "foo_1",
                uuid: "uuid-test",
            });

            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", user]])
            );

            const stopRecordingSpy = vi.spyOn(space, "stopRecording").mockResolvedValue(undefined);
            vi.spyOn(space, "getRecordingState").mockReturnValue({
                isRecording: false,
                recorder: null,
            });

            await space.updateMetadata(
                {
                    recording: {
                        recording: false,
                    },
                },
                "foo_1"
            );

            expect(stopRecordingSpy).toHaveBeenCalledWith(user);
            expect(write).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({
                                recording: {
                                    recorder: null,
                                    recording: false,
                                },
                            }),
                        },
                    },
                })
            );
        });
    });

    describe("dispatchPublicEvent", () => {
        it("should send public event to all watchers", async () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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

            await space.dispatchPublicEvent(
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

    describe("recording auto-stop", () => {
        const createCommunicationManagerMock = () => ({
            getRecordingState: vi.fn().mockReturnValue({ isRecording: false, recorder: null }),
            handleUserAdded: vi.fn().mockResolvedValue(undefined),
            handleUserDeleted: vi.fn().mockResolvedValue(undefined),
            handleUserUpdated: vi.fn().mockResolvedValue(undefined),
            handleStartRecording: vi.fn().mockResolvedValue(undefined),
            handleStopRecording: vi.fn().mockResolvedValue(undefined),
            handleRecorderLeftSpace: vi.fn().mockResolvedValue(false),
            handleServerStopRecording: vi.fn().mockResolvedValue(false),
            handleUserToNotifyAdded: vi.fn().mockResolvedValue(undefined),
            handleUserToNotifyDeleted: vi.fn().mockResolvedValue(undefined),
            handleMeetingConnectionRestartMessage: vi.fn(),
            destroy: vi.fn(),
        });

        it("should not stop recording when the removed user is still present in usersToNotify", () => {
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
            const communicationManager = createCommunicationManagerMock();
            const watcher = mock<SpacesWatcher>({ id: "watcher-1", write: vi.fn() });
            const watcher2 = mock<SpacesWatcher>({ id: "watcher-2", write: vi.fn() });
            const user = SpaceUser.fromPartial({ spaceUserId: "foo_1", uuid: "uuid-test" });

            (space as unknown as { communicationManager: typeof communicationManager }).communicationManager =
                communicationManager;
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", user]])
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher2,
                new Map<string, SpaceUser>([["foo_1", user]])
            );

            space.removeUser(watcher, "foo_1");

            expect(communicationManager.handleRecorderLeftSpace).not.toHaveBeenCalled();
        });

        it("should stop recording when removeUser removes the recorder from the last raw collection", async () => {
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
            const communicationManager = createCommunicationManagerMock();
            const write = vi.fn();
            const watcher = mock<SpacesWatcher>({ id: "watcher-1", write });
            const user = SpaceUser.fromPartial({ spaceUserId: "foo_1", uuid: "uuid-test" });

            communicationManager.handleRecorderLeftSpace.mockResolvedValue(true);
            (space as unknown as { communicationManager: typeof communicationManager }).communicationManager =
                communicationManager;
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", user]])
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher,
                new Map<string, SpaceUser>([])
            );

            space.removeUser(watcher, "foo_1");

            await vi.waitFor(() => {
                expect(communicationManager.handleRecorderLeftSpace).toHaveBeenCalledWith("foo_1");
                expect(write).toHaveBeenCalledWith(
                    BackToPusherSpaceMessage.fromPartial({
                        message: {
                            $case: "updateSpaceMetadataMessage",
                            updateSpaceMetadataMessage: {
                                spaceName: "test",
                                metadata: JSON.stringify({
                                    recording: {
                                        recorder: null,
                                        recording: false,
                                    },
                                }),
                            },
                        },
                    })
                );
            });
        });

        it("should stop recording when a userToNotify disappears from the last raw collection", () => {
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
            const communicationManager = createCommunicationManagerMock();
            const watcher = mock<SpacesWatcher>({ id: "watcher-1", write: vi.fn() });
            const user = SpaceUser.fromPartial({ spaceUserId: "foo_1", uuid: "uuid-test" });

            communicationManager.handleRecorderLeftSpace.mockResolvedValue(true);
            (space as unknown as { communicationManager: typeof communicationManager }).communicationManager =
                communicationManager;
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", user]])
            );

            space.deleteUserToNotify(watcher, user);

            expect(communicationManager.handleRecorderLeftSpace).toHaveBeenCalledWith("foo_1");
        });

        it("should stop recording only once when removing a watcher containing the user in both raw collections", () => {
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
            const communicationManager = createCommunicationManagerMock();
            const watcher = mock<SpacesWatcher>({ id: "watcher-1", write: vi.fn() });
            const user = SpaceUser.fromPartial({ spaceUserId: "foo_1", uuid: "uuid-test" });

            communicationManager.handleRecorderLeftSpace.mockResolvedValue(true);
            (space as unknown as { communicationManager: typeof communicationManager }).communicationManager =
                communicationManager;
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", user]])
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", user]])
            );

            space.removeWatcher(watcher);

            expect(communicationManager.handleRecorderLeftSpace).toHaveBeenCalledTimes(1);
            expect(communicationManager.handleRecorderLeftSpace).toHaveBeenCalledWith("foo_1");
        });

        it("should not stop recording when removeWatcher removes one watcher but the user is still present elsewhere", () => {
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
            const communicationManager = createCommunicationManagerMock();
            const watcher = mock<SpacesWatcher>({ id: "watcher-1", write: vi.fn() });
            const watcher2 = mock<SpacesWatcher>({ id: "watcher-2", write: vi.fn() });
            const user = SpaceUser.fromPartial({ spaceUserId: "foo_1", uuid: "uuid-test" });

            (space as unknown as { communicationManager: typeof communicationManager }).communicationManager =
                communicationManager;
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>([["foo_1", user]])
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher2,
                new Map<string, SpaceUser>()
            );
            (space as unknown as { usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>> }).usersToNotify.set(
                watcher2,
                new Map<string, SpaceUser>([["foo_1", user]])
            );

            space.removeWatcher(watcher);

            expect(communicationManager.handleRecorderLeftSpace).not.toHaveBeenCalled();
        });

        it("should publish a processed metadata snapshot when the server stops recording", async () => {
            const space = new Space("test", FilterType.ALL_USERS, mock<EventProcessor>(), [], "world");
            const communicationManager = createCommunicationManagerMock();
            const write = vi.fn();
            const watcher = mock<SpacesWatcher>({ id: "watcher-1", write });

            communicationManager.handleServerStopRecording.mockResolvedValue(true);
            (space as unknown as { communicationManager: typeof communicationManager }).communicationManager =
                communicationManager;
            (space as unknown as { users: Map<SpacesWatcher, Map<string, SpaceUser>> }).users.set(
                watcher,
                new Map<string, SpaceUser>()
            );

            await space.stopRecordingByServer();

            expect(write).toHaveBeenCalledWith(
                BackToPusherSpaceMessage.fromPartial({
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: "test",
                            metadata: JSON.stringify({
                                recording: {
                                    recorder: null,
                                    recording: false,
                                },
                            }),
                        },
                    },
                })
            );
        });
    });

    describe("dispatchPrivateEvent", () => {
        it("should send private event to the watcher that contains the user", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
                    senderUserId: spaceUser.spaceUserId,
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
                            sender: spaceUser,
                        },
                    },
                })
            );
        });
    });

    describe("canBeDeleted", () => {
        it("should return true if the space has no users", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
            expect(space.canBeDeleted()).toBe(true);
        });
        it("should return false if the space has users", () => {
            const space = new Space("test", FilterType.LIVE_STREAMING_USERS, mock<EventProcessor>(), [], "world");
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
});
