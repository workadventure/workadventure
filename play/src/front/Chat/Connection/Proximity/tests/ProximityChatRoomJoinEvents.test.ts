/* eslint-disable @typescript-eslint/unbound-method -- expect() on vi.fn() members of module mocks */
import * as Phaser from "phaser";
globalThis.Phaser = Phaser;

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { AvailabilityStatus, FilterType } from "@workadventure/messages";
import { loadLocaleAsync } from "../../../../../i18n/i18n-util.async";
import { setLocale } from "../../../../../i18n/i18n-svelte";
import type { SpaceInterface, SpaceUserExtended } from "../../../../Space/SpaceInterface";
import type { SpaceRegistryInterface } from "../../../../Space/SpaceRegistry/SpaceRegistryInterface";
import type { MessageUserJoined } from "../../../../Connection/ConnexionModels";
import { RemotePlayersRepository } from "../../../../Phaser/Game/RemotePlayersRepository";
import { iframeListener } from "../../../../Api/IframeListener";
import { ProximityChatRoom } from "../ProximityChatRoom";
import { DEFAULT_PROXIMITY_SPACE_NAME } from "../ProximityChatRoomManager";

vi.mock("../../../../Api/IframeListener", () => {
    // Anything the room (or a module it pulls in) calls is a spy; anything it subscribes to is a stream.
    const members = new Map<string, unknown>();
    const iframeListener = new Proxy(
        {},
        {
            get(_target, name: string) {
                if (!members.has(name)) {
                    members.set(name, name.endsWith("Stream") ? new Subject() : vi.fn());
                }
                return members.get(name);
            },
        },
    );
    return { iframeListener };
});
vi.mock("../../../../Phaser/Game/GameScene", () => ({ GameScene: class {} }));
vi.mock("../../../../Notification/NotificationManager", () => ({
    notificationManager: { createNotification: vi.fn() },
}));
vi.mock("../../../../WebRtc/FaviconManager", () => ({ faviconManager: { pushNotificationFavicon: vi.fn() } }));
vi.mock("../../../../Components/ActionBar/AvailabilityStatus/statusChanger", () => ({
    statusChanger: { setUserNameInteraction: vi.fn(), applyInteractionRules: vi.fn(), changeStatusTo: vi.fn() },
}));
vi.mock("../../../../Utils/ScreenWakeLock", () => ({
    screenWakeLock: { requestWakeLock: () => Promise.resolve(undefined) },
}));
vi.mock("../../../../Utils/BreakpointsUtils", () => ({ isMediaBreakpointUp: () => false }));
vi.mock("../../../../Phaser/Entity/CharacterLayerManager", () => ({
    CharacterLayerManager: { wokaBase64: () => Promise.resolve("") },
    wokaBase64: () => Promise.resolve(""),
}));
vi.mock("../../../../Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({ roomUrl: "room" }) },
}));
vi.mock("../../../../Connection/ConnectionManager", () => ({
    connectionManager: { roomConnectionStream: new Subject() },
}));
vi.mock("../../../../WebRtc/SimplePeer", () => ({ SimplePeer: vi.fn() }));
vi.mock("../../../../WebRtc/MediaManager", () => ({ MediaManager: vi.fn(), mediaManager: {} }));
vi.mock(
    "../../../../Enum/EnvironmentVariable.ts",
    () => import("../../../../../../tests/front/mocks/frontEnvironmentVariableMock"),
);

const MY_SPACE_USER_ID = "room_1";

function spaceUser(userId: number): SpaceUserExtended {
    return {
        spaceUserId: `room_${userId}`,
        name: `User ${userId}`,
        availabilityStatus: AvailabilityStatus.ONLINE,
        characterTextures: [],
        tags: [],
        uuid: `uuid-${userId}`,
        roomName: "room",
        playUri: "room",
        isLogged: false,
        color: "#000000",
        pictureStore: writable(undefined),
        reactiveUser: { availabilityStatus: writable(AvailabilityStatus.ONLINE) },
    } as unknown as SpaceUserExtended;
}

function player(userId: number): MessageUserJoined {
    return {
        userId,
        name: `User ${userId}`,
        characterTextures: [],
        position: { x: 0, y: 0, direction: 0, moving: false },
        availabilityStatus: AvailabilityStatus.ONLINE,
        visitCardUrl: null,
        companionTexture: undefined,
        userUuid: `uuid-${userId}`,
        outlineColor: undefined,
        variables: new Map(),
    };
}

function createFakeSpace(users: Map<string, SpaceUserExtended>) {
    const observeUserJoined = new Subject<SpaceUserExtended>();
    const space = {
        getName: () => "bubble",
        destroyed: false,
        usersStore: writable(users),
        getMetadata: () => new Map(),
        observeMetadata: new Subject(),
        observePublicEvent: () => new Subject(),
        observeUserJoined,
        observeUserLeft: new Subject<SpaceUserExtended>(),
        getUsers: () => Promise.resolve(users),
    } as unknown as SpaceInterface;
    return { space, observeUserJoined, users };
}

function createRoom(space: SpaceInterface, repository: RemotePlayersRepository): ProximityChatRoom {
    const spaceRegistry = { joinSpace: () => Promise.resolve(space) } as unknown as SpaceRegistryInterface;
    const soundManager = {
        playBubbleInSound: vi.fn(),
        playBubbleOutSound: vi.fn(),
        playMeetingInSound: vi.fn(),
        playMeetingOutSound: vi.fn(),
    } as unknown as ConstructorParameters<typeof ProximityChatRoom>[7];
    return new ProximityChatRoom(
        DEFAULT_PROXIMITY_SPACE_NAME,
        "Proximity",
        "default",
        MY_SPACE_USER_ID,
        spaceRegistry,
        iframeListener,
        repository,
        soundManager,
        undefined,
        [],
    );
}

const flush = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
const joinedUserIds = () =>
    vi
        .mocked(iframeListener.sendJoinProximityMeetingEvent)
        .mock.calls.map(([users]) => users.map((user) => user.userId));

describe("ProximityChatRoom join events", () => {
    beforeAll(async () => {
        await loadLocaleAsync("en-US");
        setLocale("en-US");
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it("waits for the zone data of users already in the space and announces them all in one go", async () => {
        const users = new Map([1, 2, 3].map((id) => [`room_${id}`, spaceUser(id)]));
        const { space, observeUserJoined } = createFakeSpace(users);
        const repository = new RemotePlayersRepository();
        const room = createRoom(space, repository);

        const joinPromise = room.joinSpace("bubble", [], false, FilterType.ALL_USERS, false);
        await flush();
        // The peers are in the space but their userJoinedMessage has not reached us yet: nothing announced.
        expect(iframeListener.sendJoinProximityMeetingEvent).not.toHaveBeenCalled();

        repository.addPlayer(player(2));
        repository.addPlayer(player(3));
        await joinPromise;

        expect(joinedUserIds()).toEqual([[2, 3]]);
        expect(iframeListener.sendJoinMeetingEvent).toHaveBeenCalledTimes(1);
        expect(iframeListener.sendParticipantJoinProximityMeetingEvent).not.toHaveBeenCalled();

        // A later peer is a participant joining, not a new meeting.
        repository.addPlayer(player(4));
        observeUserJoined.next(spaceUser(4));
        await flush();
        expect(iframeListener.sendParticipantJoinProximityMeetingEvent).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 4 }),
        );
        expect(iframeListener.sendJoinProximityMeetingEvent).toHaveBeenCalledTimes(1);
    });

    it("does not announce an empty bubble: the first peer to show up triggers the join event", async () => {
        vi.useFakeTimers();
        const users = new Map([["room_1", spaceUser(1)]]);
        const { space, observeUserJoined } = createFakeSpace(users);
        const repository = new RemotePlayersRepository();
        const room = createRoom(space, repository);

        const joinPromise = room.joinSpace("bubble", [], false, FilterType.ALL_USERS, false);
        // getFirstUsers backstop: nobody registered in the space.
        await vi.advanceTimersByTimeAsync(9_000);
        await joinPromise;
        expect(iframeListener.sendJoinProximityMeetingEvent).not.toHaveBeenCalled();
        expect(iframeListener.sendJoinMeetingEvent).not.toHaveBeenCalled();

        observeUserJoined.next(spaceUser(2));
        repository.addPlayer(player(2));
        await vi.advanceTimersByTimeAsync(0);
        expect(joinedUserIds()).toEqual([[2]]);
        expect(iframeListener.sendJoinMeetingEvent).toHaveBeenCalledTimes(1);
        expect(iframeListener.sendParticipantJoinProximityMeetingEvent).not.toHaveBeenCalled();

        repository.addPlayer(player(3));
        observeUserJoined.next(spaceUser(3));
        await vi.advanceTimersByTimeAsync(0);
        expect(iframeListener.sendParticipantJoinProximityMeetingEvent).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 3 }),
        );
        expect(iframeListener.sendJoinProximityMeetingEvent).toHaveBeenCalledTimes(1);
    });
});
