import { describe, expect, it } from "vitest";
import { Space } from "../../src/pusher/models/Space";
import { BackSpaceConnection, ExSocketInterface } from "../../src/pusher/models/Websocket/ExSocketInterface";
import { mock } from "vitest-mock-extended";
import { PartialSpaceUser, PusherToBackSpaceMessage, SpaceFilterMessage, SubMessage } from "@workadventure/messages";
describe("Space", () => {
    let eventsWatcher: PusherToBackSpaceMessage[] = [];
    const backSpaceConnection = mock<BackSpaceConnection>({
        write(chunk: PusherToBackSpaceMessage): boolean {
            eventsWatcher.push(chunk);
            return true;
        },
    });
    let eventsClient: SubMessage[] = [];
    const spacesFilters = new Map<string, SpaceFilterMessage[]>([
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
    const client = mock<ExSocketInterface>({
        emitInBatch: (payload: SubMessage) => {
            eventsClient.push(payload);
        },
        spacesFilters,
    });
    const space = new Space("test", backSpaceConnection, 1, client);
    it("should return true because Space is empty", () => {
        expect(space.isEmpty()).toBe(true);
    });
    it("should notify client and back that a new user is added", () => {
        const spaceUser = {
            uuid: "uuid-test",
            name: "test",
            playUri: "test",
            color: "#000000",
            roomName: "test",
            isLogged: false,
            availabilityStatus: 0,
            videoSharing: false,
            audioSharing: false,
            screenSharing: false,
            characterLayers: [],
            tags: [],
            visitCardUrl: undefined,
        };
        space.addUser(spaceUser);
        expect(eventsClient.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(true);
        expect(eventsWatcher.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(true);
    });
    it("should return false because Space is not empty", () => {
        expect(space.isEmpty()).toBe(false);
    });
    it("should notify client and back that a user is updated", () => {
        eventsClient = [];
        eventsWatcher = [];
        const spaceUser = PartialSpaceUser.fromPartial({
            uuid: "uuid-test",
            name: "test2",
            playUri: "test2",
            color: "#FFFFFF",
            roomName: "test2",
            isLogged: true,
            availabilityStatus: 1,
            videoSharing: true,
            audioSharing: true,
            screenSharing: true,
            characterLayers: [],
            tags: [],
            visitCardUrl: "test",
        });
        space.updateUser(spaceUser);
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
        expect(user?.videoSharing).toBe(true);
        expect(user?.audioSharing).toBe(true);
        expect(user?.screenSharing).toBe(true);
        expect(user?.visitCardUrl).toBe("test");
    });
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
        client.spacesFilters.set("test", [filter]);
        space.handleAddFilter(client, { spaceFilterMessage: filter });
        expect(eventsClient.length).toBe(0);
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
        client.spacesFilters.set("test", [spaceFilterMessage]);
        expect(eventsClient.some((message) => message.message?.$case === "removeSpaceUserMessage")).toBe(true);
        const message = eventsClient.find((message) => message.message?.$case === "removeSpaceUserMessage");
        expect(message).toBeDefined();
        const subMessage = message?.message;
        if (!subMessage || subMessage.$case !== "removeSpaceUserMessage") {
            throw new Error("subMessage is not defined");
        }
        const removeSpaceUserMessage = subMessage.removeSpaceUserMessage;
        expect(removeSpaceUserMessage).toBeDefined();
        expect(removeSpaceUserMessage?.userUuid).toBe("uuid-test");
    });
    it("should notify client that have filters that match the user", () => {
        eventsClient = [];
        const spaceUser = {
            uuid: "uuid-test2",
            name: "johnny",
            playUri: "test",
            color: "#000000",
            roomName: "test",
            isLogged: false,
            availabilityStatus: 0,
            videoSharing: false,
            audioSharing: false,
            screenSharing: false,
            characterLayers: [],
            tags: [],
            visitCardUrl: undefined,
        };
        space.addUser(spaceUser);
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
    it("should remove the name filter and send me the delta (add userMessage)", () => {
        client.spacesFilters.set("test", []);
        eventsClient = [];
        space.handleRemoveFilter(client, {
            spaceFilterMessage: {
                filterName: "test",
                spaceName: "test",
                filter: undefined,
            },
        });
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
        expect(user?.uuid).toBe("uuid-test");
    });
    it("should notify client and back that a user is removed", () => {
        eventsClient = [];
        eventsWatcher = [];
        space.removeUser("uuid-test");
        expect(eventsClient.some((message) => message.message?.$case === "removeSpaceUserMessage")).toBe(true);
        expect(eventsWatcher.some((message) => message.message?.$case === "removeSpaceUserMessage")).toBe(true);
    });
});
