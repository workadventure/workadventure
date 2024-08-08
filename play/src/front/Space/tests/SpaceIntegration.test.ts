import {
    AddSpaceUserMessage,
    UpdateSpaceUserMessage,
    RemoveSpaceUserMessage,
    UpdateSpaceMetadataMessage,
    SpaceUser,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { describe, expect, it, vi, assert } from "vitest";
import { get } from "svelte/store";
import { LocalSpaceProvider } from "../SpaceProvider/SpaceStore";
import { RoomConnection } from "../../Connection/RoomConnection";
import { StreamSpaceWatcher } from "../SpaceWatcher/SocketSpaceWatcher";
import { SpaceFilter } from "../SpaceFilter/SpaceFilter";

class MockRoomConnection {
    public addSpaceUserMessageStream = new Subject<AddSpaceUserMessage>();
    public updateSpaceUserMessageStream = new Subject<UpdateSpaceUserMessage>();
    public removeSpaceUserMessageStream = new Subject<RemoveSpaceUserMessage>();
    public updateSpaceMetadataMessageStream = new Subject<UpdateSpaceMetadataMessage>();
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
        const spaceStore = new LocalSpaceProvider(roomConnection);

        new StreamSpaceWatcher(roomConnection, spaceStore);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        spaceStore.add(spaceName).watch(spaceFilterName);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(roomConnection.emitWatchSpace).toHaveBeenCalledOnce();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(roomConnection.emitAddSpaceFilter).toHaveBeenCalledOnce();
    });

    it("should add user inSpaceFilter._users when receive AddSpaceUserMessage", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceStore = new LocalSpaceProvider(roomConnection as unknown as RoomConnection);

        new StreamSpaceWatcher(roomConnection as unknown as RoomConnection, spaceStore);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        const space = spaceStore.add(spaceName);
        const spaceFilter = space.watch(spaceFilterName) as unknown as SpaceFilter;

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
        const spaceStore = new LocalSpaceProvider(roomConnection as unknown as RoomConnection);

        new StreamSpaceWatcher(roomConnection as unknown as RoomConnection, spaceStore);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        const space = spaceStore.add(spaceName);
        const spaceFilter = space.watch(spaceFilterName) as unknown as SpaceFilter;

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
        expect(spaceFilter["setUsers"]).toBeDefined();
    });

    it("should define reactive property after... ", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceStore = new LocalSpaceProvider(roomConnection as unknown as RoomConnection);

        new StreamSpaceWatcher(roomConnection as unknown as RoomConnection, spaceStore);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        const space = spaceStore.add(spaceName);
        const spaceFilter = space.watch(spaceFilterName) as unknown as SpaceFilter;

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
        const spaceStore = new LocalSpaceProvider(roomConnection as unknown as RoomConnection);

        new StreamSpaceWatcher(roomConnection as unknown as RoomConnection, spaceStore);

        const spaceName = "space1";
        const spaceFilterName = "spaceFilter1";

        const space = spaceStore.add(spaceName);
        const spaceFilter = space.watch(spaceFilterName) as unknown as SpaceFilter;

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
});
