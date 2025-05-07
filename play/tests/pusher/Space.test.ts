import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import {
    AvailabilityStatus,
    PusherToBackSpaceMessage,
    SpaceFilterMessage,
    SpaceUser,
    SubMessage,
} from "@workadventure/messages";
import { Color } from "@workadventure/shared-utils";
import { Space } from "../../src/pusher/models/Space";
import { BackSpaceConnection } from "../../src/pusher/models/Websocket/SocketData";
import { Socket } from "../../src/pusher/services/SocketManager";
import { Zone } from "../../src/pusher/models/Zone";
import { EventProcessor } from "../../src/pusher/models/EventProcessor";
describe("Space", () => {
    let eventsWatcher: PusherToBackSpaceMessage[] = [];
    const backSpaceConnection = mock<BackSpaceConnection>({
        write(chunk: PusherToBackSpaceMessage): boolean {
            eventsWatcher.push(chunk);
            return true;
        },
    });
    let eventsClient: SubMessage[] = [];
    const clientData = {
        rejected: false,
        disconnecting: false,
        token: "",
        roomId: "",
        userId: 1,
        userUuid: "",
        isLogged: false,
        ipAddress: "",
        name: "",
        characterTextures: [],
        companionTexture: undefined,
        position: { x: 0, y: 0, direction: "up", moving: false },
        viewport: { left: 0, top: 0, right: 0, bottom: 0 },
        availabilityStatus: AvailabilityStatus.ONLINE,
        lastCommandId: undefined,
        messages: [],
        tags: [],
        visitCardUrl: null,
        userRoomToken: undefined,
        activatedInviteUser: undefined,
        applications: undefined,
        canEdit: false,
        spaceUser: SpaceUser.fromPartial({
            spaceUserId: "foo_1",
            uuid: "",
            name: "",
            playUri: "",
            roomName: "",
            availabilityStatus: AvailabilityStatus.ONLINE,
            isLogged: false,
            color: Color.getColorByString(""),
            tags: [],
            cameraState: false,
            screenSharingState: false,
            microphoneState: false,
            megaphoneState: false,
            characterTextures: [
                {
                    url: "",
                    id: "",
                },
            ],
            visitCardUrl: undefined,
        }),
        batchedMessages: {
            event: "",
            payload: [],
        },
        batchTimeout: null,
        backConnection: undefined,
        listenedZones: new Set<Zone>(),
        pusherRoom: undefined,
        spaces: [],
        spacesFilters: new Map<string, SpaceFilterMessage[]>([
            [
                "test",
                [
                    {
                        filterName: "default",
                        spaceName: "test",
                        filter: {
                            $case: "spaceFilterEverybody",
                            spaceFilterEverybody: {},
                        },
                    },
                ],
            ],
        ]),
        cameraState: undefined,
        microphoneState: undefined,
        screenSharingState: undefined,
        megaphoneState: undefined,
        emitInBatch: (payload: SubMessage) => {
            eventsClient.push(payload);
        },
    };
    const client = mock<Socket>({
        getUserData: vi.fn().mockReturnValue(clientData),
    });
    const space = new Space("test", "localTest", backSpaceConnection, 1, new EventProcessor());
    it("should return true because Space is empty", () => {
        expect(space.isEmpty()).toBe(true);
    });
    it("should notify client and back that a new user is added", () => {
        const spaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo_1",
            uuid: "uuid-test",
            name: "test",
            playUri: "test",
            color: "#000000",
            roomName: "test",
            isLogged: false,
            availabilityStatus: 0,
            cameraState: false,
            microphoneState: false,
            screenSharingState: false,
            megaphoneState: false,
            characterTextures: [],
            tags: [],
        });
        space.addUser(spaceUser, client);
        expect(eventsClient.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(true);
        expect(eventsWatcher.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(true);
    });
    it("should return false because Space is not empty", () => {
        expect(space.isEmpty()).toBe(false);
    });
    it("should notify client and back that a user is updated", () => {
        eventsClient = [];
        eventsWatcher = [];
        const spaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo_1",
            uuid: "uuid-test",
            name: "test2",
            playUri: "test2",
            color: "#FFFFFF",
            roomName: "test2",
            isLogged: true,
            availabilityStatus: 1,
            cameraState: true,
            microphoneState: true,
            screenSharingState: true,
            megaphoneState: true,
            characterTextures: [],
            tags: [],
            visitCardUrl: "test",
        });
        space.updateUser(spaceUser, [
            "name",
            "playUri",
            "color",
            "roomName",
            "isLogged",
            "availabilityStatus",
            "cameraState",
            "microphoneState",
            "screenSharingState",
            "megaphoneState",
            "visitCardUrl",
        ]);
        expect(eventsClient.some((message) => message.message?.$case === "updateSpaceUserMessage")).toBe(true);
        expect(eventsWatcher.some((message) => message.message?.$case === "updateSpaceUserMessage")).toBe(true);

        const message = eventsWatcher.find((message) => message.message?.$case === "updateSpaceUserMessage");
        expect(message).toBeDefined();
        const subMessage = message?.message;
        if (!subMessage || subMessage.$case !== "updateSpaceUserMessage") {
            throw new Error("subMessage is not defined");
        }
        const updateSpaceUserMessage = subMessage.updateSpaceUserMessage;
        expect(updateSpaceUserMessage).toBeDefined();
        const user = updateSpaceUserMessage?.user;
        expect(user).toBeDefined();
        expect(user?.name).toBe("test2");
        expect(user?.playUri).toBe("test2");
        expect(user?.color).toBe("#FFFFFF");
        expect(user?.roomName).toBe("test2");
        expect(user?.isLogged).toBe(true);
        expect(user?.availabilityStatus).toBe(1);
        expect(user?.cameraState).toBe(true);
        expect(user?.microphoneState).toBe(true);
        expect(user?.megaphoneState).toBe(true);
        expect(user?.screenSharingState).toBe(true);
        expect(user?.visitCardUrl).toBe("test");
    });
    // Previously, the test developed by César was expecting "no delta" (because user is already sent, and delta return nothing)
    // But this does not seem logical and was probably testing a bug. Indeed, when adding a new filter, we send all the users matching the filter
    // even if another filter already exists.
    it("should add the name filter 'test' and send me the delta (nothing because user is already sent, and delta return nothing)", () => {
        eventsClient = [];
        const filter: SpaceFilterMessage = {
            filterName: "test",
            spaceName: "test",
            filter: {
                $case: "spaceFilterContainName",
                spaceFilterContainName: {
                    value: "es",
                },
            },
        };
        client.getUserData().spacesFilters.set("test", [filter]);
        space.handleAddFilter(client, { spaceFilterMessage: filter });
        expect(eventsClient.length).toBe(1);
    });
    it("should update the name filter 'john' and send me the delta (remove userMessage)", () => {
        const spaceFilterMessage: SpaceFilterMessage = {
            filterName: "test",
            spaceName: "test",
            filter: {
                $case: "spaceFilterContainName",
                spaceFilterContainName: {
                    value: "john",
                },
            },
        };
        space.handleUpdateFilter(client, { spaceFilterMessage });
        client.getUserData().spacesFilters.set("test", [spaceFilterMessage]);
        expect(eventsClient.some((message) => message.message?.$case === "removeSpaceUserMessage")).toBe(true);
        const message = eventsClient.find((message) => message.message?.$case === "removeSpaceUserMessage");
        expect(message).toBeDefined();
        const subMessage = message?.message;
        if (!subMessage || subMessage.$case !== "removeSpaceUserMessage") {
            throw new Error("subMessage is not defined");
        }
        const removeSpaceUserMessage = subMessage.removeSpaceUserMessage;
        expect(removeSpaceUserMessage).toBeDefined();
        expect(removeSpaceUserMessage?.spaceUserId).toBe("foo_1");
    });
    it("should notify client that have filters that match the user", () => {
        eventsClient = [];
        const spaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo_2",
            uuid: "uuid-test2",
            name: "johnny",
            playUri: "test",
            color: "#000000",
            roomName: "test",
            isLogged: false,
            availabilityStatus: 0,
            cameraState: false,
            microphoneState: false,
            screenSharingState: false,
            megaphoneState: false,
            characterTextures: [],
            tags: [],
        });
        const clientData2 = {
            ...clientData,
            spaceUser,
            userId: 2,
        };
        const client2 = mock<Socket>({
            getUserData: vi.fn().mockReturnValue(clientData2),
        });
        space.addUser(spaceUser, client2);
        expect(eventsClient.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(true);
        const message = eventsClient.find((message) => message.message?.$case === "addSpaceUserMessage");
        expect(message).toBeDefined();
        const subMessage = message?.message;
        if (!subMessage || subMessage.$case !== "addSpaceUserMessage") {
            throw new Error("subMessage is not defined");
        }
        const addSpaceUserMessage = subMessage.addSpaceUserMessage;
        expect(addSpaceUserMessage).toBeDefined();
        const user = addSpaceUserMessage.user;
        expect(user).toBeDefined();
        expect(user?.name).toBe("johnny");
    });
    it("should remove the name filter and NOT send me anything", () => {
        client.getUserData().spacesFilters = new Map<string, SpaceFilterMessage[]>([
            [
                "test",
                [
                    {
                        filterName: "default",
                        spaceName: "test",
                        filter: {
                            $case: "spaceFilterEverybody",
                            spaceFilterEverybody: {},
                        },
                    },
                ],
            ],
        ]);
        eventsClient = [];
        space.handleRemoveFilter(client, {
            spaceFilterMessage: {
                filterName: "test",
                spaceName: "test",
                filter: undefined,
            },
        });
        expect(eventsClient.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(false);
    });

    it("should notify client and back that a user is removed", () => {
        eventsClient = [];
        eventsWatcher = [];
        space.removeUser(client);
        //expect(eventsClient.some((message) => message.message?.$case === "removeSpaceUserMessage")).toBe(true);
        expect(eventsWatcher.some((message) => message.message?.$case === "removeSpaceUserMessage")).toBe(true);
    });
});
