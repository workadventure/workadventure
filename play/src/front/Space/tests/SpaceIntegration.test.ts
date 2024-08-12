import {
    AddSpaceUserMessage,
    UpdateSpaceUserMessage,
    RemoveSpaceUserMessage,
    UpdateSpaceMetadataMessage,
    SpaceUser,
    PublicEvent,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { describe, expect, it, vi, assert } from "vitest";
import { get } from "svelte/store";
import { SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import { RoomConnection } from "../../Connection/RoomConnection";

class MockRoomConnection {
    public addSpaceUserMessageStream = new Subject<AddSpaceUserMessage>();
    public updateSpaceUserMessageStream = new Subject<UpdateSpaceUserMessage>();
    public removeSpaceUserMessageStream = new Subject<RemoveSpaceUserMessage>();
    public updateSpaceMetadataMessageStream = new Subject<UpdateSpaceMetadataMessage>();
    public proximityPublicMessageEvent = new Subject<PublicEvent>();
    public emitUserJoinSpace = vi.fn();
    public emitAddSpaceFilter = vi.fn();
    public emitWatchSpace = vi.fn();
    // Add any other methods or properties that need to be mocked
}

vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

const flushPromises = () => new Promise(setImmediate);

describe("", () => {
    it("should emit event when you create space and spaceFilter", () => {
        const roomConnection = new MockRoomConnection() as unknown as RoomConnection;
        const spaceRegistry = new SpaceRegistry(roomConnection);

        const spaceName = "space1";

        spaceRegistry.joinSpace(spaceName).watchAllUsers();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(roomConnection.emitWatchSpace).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(roomConnection.emitAddSpaceFilter).toHaveBeenCalledOnce();
    });

    it("should add user inSpaceFilter._users when receive AddSpaceUserMessage", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection as unknown as RoomConnection);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        const space = spaceRegistry.joinSpace(spaceName);
        const spaceFilter = space.watchAllUsers(spaceFilterName) as unknown as AbstractSpaceFilter;

        const userFromMessage = {
            id: 1,
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
            chatID: undefined,
        };

        const addSpaceUserMessage: AddSpaceUserMessage = {
            spaceName,
            filterName: spaceFilterName,
            user: userFromMessage,
        };

        roomConnection.addSpaceUserMessageStream.next(addSpaceUserMessage);

        await flushPromises();

        const userToCompare = spaceFilter["_users"].get(userFromMessage.id);

        expect(userToCompare).toBeDefined();
    });

    it("(spaceFilter) should synchro usersStore to _users and set setUsers function at the first subscription", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection as unknown as RoomConnection);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        const space = spaceRegistry.joinSpace(spaceName);
        const spaceFilter = space.watchAllUsers(spaceFilterName) as unknown as AbstractSpaceFilter;

        const userFromMessage = {
            id: 1,
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
            chatID: undefined,
        };

        const addSpaceUserMessage: AddSpaceUserMessage = {
            spaceName,
            filterName: spaceFilterName,
            user: userFromMessage,
        };

        roomConnection.addSpaceUserMessageStream.next(addSpaceUserMessage);

        await flushPromises();

        expect(get(spaceFilter.usersStore)).toBe(spaceFilter["_users"]);
        expect(spaceFilter["_setUsers"]).toBeDefined();
    });

    it("should define reactive property after... ", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection as unknown as RoomConnection);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        const space = spaceRegistry.joinSpace(spaceName);
        const spaceFilter = space.watchAllUsers(spaceFilterName) as unknown as AllUsersSpaceFilter;

        const userFromMessage = {
            id: 1,
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
            chatID: "chat@id.fr",
        };

        const addSpaceUserMessage: AddSpaceUserMessage = {
            spaceName,
            filterName: spaceFilterName,
            user: userFromMessage,
        };

        roomConnection.addSpaceUserMessageStream.next(addSpaceUserMessage);

        await flushPromises();

        const userToCompare = get(spaceFilter.usersStore).get(userFromMessage.id);

        if (!userToCompare) assert.fail("user not found in store");

        expect(get(userToCompare.reactiveUser.chatID)).toBe("chat@id.fr");
    });

    it("... ", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection as unknown as RoomConnection);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        const space = spaceRegistry.joinSpace(spaceName);
        const spaceFilter = space.watchAllUsers(spaceFilterName) as unknown as AbstractSpaceFilter;

        const userFromMessage = {
            id: 1,
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
            chatID: "chat@id.fr",
        };

        const addSpaceUserMessage: AddSpaceUserMessage = {
            spaceName,
            filterName: spaceFilterName,
            user: userFromMessage,
        };

        roomConnection.addSpaceUserMessageStream.next(addSpaceUserMessage);

        await flushPromises();

        const spaceUserUpdate = SpaceUser.fromPartial({
            id: 1,
            chatID: "new@id.fr",
        });
        const updateSpaceUserMessage: UpdateSpaceUserMessage = {
            spaceName,
            user: spaceUserUpdate,
            updateMask: ["chatID"],
            filterName: spaceFilterName,
        };

        const userToCompare = get(spaceFilter.usersStore).get(userFromMessage.id);

        if (!userToCompare) assert.fail("user not found in store");

        const subscriber = vi.fn();

        const unsubscriber = userToCompare.reactiveUser.chatID.subscribe(subscriber);

        roomConnection.updateSpaceUserMessageStream.next(updateSpaceUserMessage);

        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(subscriber).toHaveBeenLastCalledWith("new@id.fr");

        unsubscriber();
    });

    it("should forward public events to the space", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection as unknown as RoomConnection);

        const spaceName = "space1";

        const space = spaceRegistry.joinSpace(spaceName);

        const subscriber = vi.fn();

        const unsubscriber = space.observePublicEvent("spaceMessage").subscribe(subscriber);

        roomConnection.proximityPublicMessageEvent.next({
            spaceName: "space1",
            senderUserId: 1,
            spaceEvent: {
                event: {
                    $case: "spaceMessage",
                    spaceMessage: {
                        message: "Hello",
                    },
                },
            },
        });

        await flushPromises();

        expect(subscriber).toHaveBeenCalledOnce();
        expect(subscriber).toHaveBeenLastCalledWith({
            spaceName: "space1",
            sender: 1,
            $case: "spaceMessage",
            spaceMessage: {
                message: "Hello",
            },
        });

        unsubscriber.unsubscribe();
    });
});
