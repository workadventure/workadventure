import {
    UpdateSpaceMetadataMessage,
    SpaceUser,
    PublicEvent,
    PrivateEvent,
    AddSpaceUserPusherToFrontMessage,
    RemoveSpaceUserPusherToFrontMessage,
    UpdateSpaceUserPusherToFrontMessage,
    KickOffUserPrivateMessage,
    MuteAudioForEverybodyPublicMessage,
    MuteAudioPrivateMessage,
    MuteVideoForEverybodyPublicMessage,
    MuteVideoPrivateMessage,
    SpaceDestroyedMessage,
    SpaceIsTyping,
    SpaceMessage,
    FilterType,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { describe, expect, it, vi, assert } from "vitest";
import { get } from "svelte/store";
import { RoomConnectionForSpacesInterface, SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import { SpaceUserExtended } from "../SpaceInterface";

/* eslint @typescript-eslint/unbound-method: 0 */

class MockRoomConnection implements RoomConnectionForSpacesInterface {
    public addSpaceUserMessageStream = new Subject<AddSpaceUserPusherToFrontMessage>();
    public updateSpaceUserMessageStream = new Subject<UpdateSpaceUserPusherToFrontMessage>();
    public removeSpaceUserMessageStream = new Subject<RemoveSpaceUserPusherToFrontMessage>();
    public updateSpaceMetadataMessageStream = new Subject<UpdateSpaceMetadataMessage>();
    public emitUserJoinSpace = vi.fn();
    public emitAddSpaceFilter = vi.fn();
    public emitRemoveSpaceFilter = vi.fn();
    public emitJoinSpace = vi.fn();
    public emitLeaveSpace = vi.fn();
    public spacePublicMessageEvent = new Subject<PublicEvent>();
    public spacePrivateMessageEvent = new Subject<PrivateEvent>();
    public spaceDestroyedMessage = new Subject<SpaceDestroyedMessage>();
    public emitPrivateSpaceEvent(
        spaceName: string,
        spaceEvent: NonNullable<
            | { $case: "muteVideo"; muteVideo: MuteVideoPrivateMessage }
            | { $case: "muteAudio"; muteAudio: MuteAudioPrivateMessage }
            | { $case: "kickOffUser"; kickOffUser: KickOffUserPrivateMessage }
            | undefined
        >,
        receiverUserId: string
    ): void {
        throw new Error("Method not implemented.");
    }
    public emitPublicSpaceEvent(
        spaceName: string,
        spaceEvent: NonNullable<
            | { $case: "spaceMessage"; spaceMessage: SpaceMessage }
            | { $case: "spaceIsTyping"; spaceIsTyping: SpaceIsTyping }
            | { $case: "muteAudioForEverybody"; muteAudioForEverybody: MuteAudioForEverybodyPublicMessage }
            | { $case: "muteVideoForEverybody"; muteVideoForEverybody: MuteVideoForEverybodyPublicMessage }
            | undefined
        >
    ): void {
        throw new Error("Method not implemented.");
    }

    public emitUpdateSpaceMetadata(spaceName: string, metadata: { [key: string]: unknown }): void {
        throw new Error("Method not implemented.");
    }
    public emitUpdateSpaceUserMessage(spaceName: string, spaceUser: Omit<Partial<SpaceUser>, "id">): void {
        throw new Error("Method not implemented.");
    }

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

vi.mock("../../Connection/ConnectionManager", () => {
    return {
        connectionManager: {
            roomConnectionStream: new Subject(),
        },
    };
});
const flushPromises = () => new Promise(setImmediate);

describe("", () => {
    it("should emit event when you create space and spaceFilter", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection, new Subject());

        const spaceName = "space1";

        const space = await spaceRegistry.joinSpace(spaceName, FilterType.ALL_USERS);

        expect(roomConnection.emitJoinSpace).toHaveBeenCalledOnce();

        const unsubscribeUserStore = space.usersStore.subscribe(() => {});

        expect(roomConnection.emitAddSpaceFilter).toHaveBeenCalledOnce();

        const observeUserLeft = space.observeUserJoined.subscribe(() => {});

        expect(roomConnection.emitAddSpaceFilter).toHaveBeenCalledOnce();

        unsubscribeUserStore();

        expect(roomConnection.emitRemoveSpaceFilter).not.toHaveBeenCalled();
        observeUserLeft.unsubscribe();
        expect(roomConnection.emitRemoveSpaceFilter).toHaveBeenCalledOnce();
    });

    it("should add user inSpaceFilter._users when receive AddSpaceUserMessage", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection, new Subject());

        const spaceName = "space1";

        const space = await spaceRegistry.joinSpace(spaceName, FilterType.ALL_USERS);

        const userFromMessage = {
            spaceUserId: "foo_1",
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
            showVoiceIndicator: false,
        } satisfies SpaceUser;

        const addSpaceUserMessage: AddSpaceUserPusherToFrontMessage = {
            spaceName,
            user: userFromMessage,
        };

        let users: Map<string, SpaceUserExtended> = new Map();
        const unsubscribe = space.usersStore.subscribe((newUsers) => {
            users = newUsers;
        });

        roomConnection.addSpaceUserMessageStream.next(addSpaceUserMessage);

        await flushPromises();

        const userToCompare = users.get(userFromMessage.spaceUserId);

        expect(userToCompare).toBeDefined();

        unsubscribe();
    });

    it("should define reactive property after... ", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection, new Subject());

        const spaceName = "space1";

        const space = await spaceRegistry.joinSpace(spaceName, FilterType.ALL_USERS);

        const userFromMessage = {
            spaceUserId: "foo_1",
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
            showVoiceIndicator: false,
        } satisfies SpaceUser;

        const addSpaceUserMessage: AddSpaceUserPusherToFrontMessage = {
            spaceName,
            user: userFromMessage,
        };

        roomConnection.addSpaceUserMessageStream.next(addSpaceUserMessage);

        await flushPromises();

        const userToCompare = get(space.usersStore).get(userFromMessage.spaceUserId);

        if (!userToCompare) assert.fail("user not found in store");

        expect(get(userToCompare.reactiveUser.chatID)).toBe("chat@id.fr");
    });

    it("... ", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection, new Subject());

        const spaceName = "space1";

        const space = await spaceRegistry.joinSpace(spaceName, FilterType.ALL_USERS);

        const userFromMessage = {
            spaceUserId: "foo_1",
            name: "testName",
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
            showVoiceIndicator: false,
        } satisfies SpaceUser;

        const addSpaceUserMessage: AddSpaceUserPusherToFrontMessage = {
            spaceName,
            user: userFromMessage,
        };

        roomConnection.addSpaceUserMessageStream.next(addSpaceUserMessage);

        await flushPromises();

        const spaceUserUpdate = SpaceUser.fromPartial({
            spaceUserId: "foo_1",
            chatID: "new@id.fr",
        });
        const updateSpaceUserMessage: UpdateSpaceUserPusherToFrontMessage = {
            spaceName,
            user: spaceUserUpdate,
            updateMask: ["chatID"],
        };

        const userToCompare = get(space.usersStore).get(userFromMessage.spaceUserId);

        if (!userToCompare) assert.fail("user not found in store");

        const subscriber = vi.fn();

        const unsubscriber = userToCompare.reactiveUser.chatID.subscribe(subscriber);

        roomConnection.updateSpaceUserMessageStream.next(updateSpaceUserMessage);

        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(subscriber).toHaveBeenLastCalledWith("new@id.fr");

        expect(get(space.usersStore).get(userFromMessage.spaceUserId)?.name).toBe("testName");

        unsubscriber();
    });

    it("should forward public events to the space", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection, new Subject());

        const spaceName = "space1";

        const space = await spaceRegistry.joinSpace(spaceName, FilterType.ALL_USERS);

        const subscriber = vi.fn();

        const unsubscriber = space.observePublicEvent("spaceMessage").subscribe(subscriber);

        roomConnection.spacePublicMessageEvent.next({
            spaceName: "space1",
            senderUserId: "foo_1",
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
            sender: "foo_1",
            $case: "spaceMessage",
            spaceMessage: {
                message: "Hello",
            },
        });

        unsubscriber.unsubscribe();
    });

    it("should forward private events to the space", async () => {
        const roomConnection = new MockRoomConnection();
        const spaceRegistry = new SpaceRegistry(roomConnection, new Subject());

        const spaceName = "space1";

        const space = await spaceRegistry.joinSpace(spaceName, FilterType.ALL_USERS);

        const subscriber = vi.fn();

        const unsubscriber = space.observePrivateEvent("muteVideo").subscribe(subscriber);

        roomConnection.spacePrivateMessageEvent.next({
            spaceName: "space1",
            senderUserId: "foo_1",
            receiverUserId: "foo_2",
            spaceEvent: {
                event: {
                    $case: "muteVideo",
                    muteVideo: {
                        force: true,
                    },
                },
            },
        });

        await flushPromises();

        expect(subscriber).toHaveBeenCalledOnce();
        expect(subscriber).toHaveBeenLastCalledWith({
            spaceName: "space1",
            sender: "foo_1",
            $case: "muteVideo",
            muteVideo: {
                force: true,
            },
        });

        unsubscriber.unsubscribe();
    });
});
