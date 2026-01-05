import * as Phaser from "phaser";
globalThis.Phaser = Phaser;

import { describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { FilterType } from "@workadventure/messages";
import type { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";
import { SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import type { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space } from "../Space";
import type { SpaceRegistryInterface } from "../SpaceRegistry/SpaceRegistryInterface";
import { MockRoomConnectionForSpaces } from "./MockRoomConnectionForSpaces";

vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

vi.mock("../../Phaser/Game/GameManager", () => {
    return {
        gameManager: {
            getCurrentGameScene: () => ({
                getRemotePlayersRepository: () => ({
                    getPlayer: vi.fn(),
                }),
                roomUrl: "test-room",
            }),
        },
    };
});

// Mock SimplePeer
vi.mock("../../WebRtc/SimplePeer", () => ({
    SimplePeer: vi.fn().mockImplementation(() => ({
        closeAllConnections: vi.fn(),
        destroy: vi.fn(),
    })),
}));

vi.mock("../../Stores/ScreenSharingStore", () => {
    const requested = writable(false);
    return {
        requestedScreenSharingState: {
            subscribe: requested.subscribe,
            enableScreenSharing: () => requested.set(true),
            disableScreenSharing: () => requested.set(false),
        },
        screenSharingLocalStreamStore: writable({ type: "success" }),
        screenSharingConstraintsStore: writable({ video: false, audio: false }),
        screenSharingAvailableStore: writable(false),
        screenShareBandwidthStore: {
            subscribe: writable<number | "unlimited">(0).subscribe,
            setBandwidth: vi.fn(),
        },
        screenSharingLocalMedia: writable(undefined),
    };
});

vi.mock("../../Enum/EnvironmentVariable.ts", () => {
    return {
        PUSHER_URL: "http://localhost",
    };
});

vi.mock("../../Stores/MegaphoneStore", () => {
    return {
        liveStreamingEnabledStore: writable(false),
        requestedMegaphoneStore: writable(false),
        megaphoneSpaceStore: writable(undefined),
        megaphoneCanBeUsedStore: writable(false),
    };
});

vi.mock("../../Stores/MenuStore", () => {
    return {
        menuIconVisiblilityStore: writable(false),
        menuVisiblilityStore: writable(false),
        screenSharingActivatedStore: writable(false),
        inviteUserActivated: writable(false),
        mapEditorActivated: writable(false),
        roomListActivated: writable(false),
    };
});

vi.mock("../../WebRtc/MediaManager", () => {
    return {
        MediaManager: vi.fn(),
        mediaManager: {
            enableMyCamera: vi.fn(),
            disableMyCamera: vi.fn(),
            enableMyMicrophone: vi.fn(),
            disableMyMicrophone: vi.fn(),
            enableProximityMeeting: vi.fn(),
            disableProximityMeeting: vi.fn(),
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

vi.mock("../../Enum/EnvironmentVariable.ts", () => {
    return {
        MATRIX_ADMIN_USER: "admin",
        MATRIX_DOMAIN: "domain",
        STUN_SERVER: "stun:test.com:19302",
        TURN_SERVER: "turn:test.com:19302",
        TURN_USER: "user",
        TURN_PASSWORD: "password",
        POSTHOG_API_KEY: "test-api-key",
        POSTHOG_URL: "https://test.com",
        MAX_USERNAME_LENGTH: 10,
        PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: 1000,
        PEER_VIDEO_RECOMMENDED_BANDWIDTH: 1000,
        PUSHER_URL: "http://localhost",
        FALLBACK_LOCALE: "en-US",
        ENABLE_CHAT: true,
        KLAXOON_ENABLED: false,
        KLAXOON_CLIENT_ID: "",
        YOUTUBE_ENABLED: false,
        GOOGLE_DRIVE_ENABLED: false,
        GOOGLE_DOCS_ENABLED: false,
        GOOGLE_SHEETS_ENABLED: false,
        GOOGLE_SLIDES_ENABLED: false,
        ERASER_ENABLED: false,
        EXCALIDRAW_ENABLED: false,
        EXCALIDRAW_DOMAINS: [],
        CARDS_ENABLED: false,
        TLDRAW_ENABLED: false,
    };
});

const defaultRoomConnectionMock: RoomConnectionForSpacesInterface = new MockRoomConnectionForSpaces();

describe("SpaceProviderInterface implementation", () => {
    describe("SpaceRegistry", () => {
        describe("SpaceRegistry Add", () => {
            it("should add a space when ...", async () => {
                const newSpace: Pick<SpaceInterface, "getName"> = {
                    getName(): string {
                        return "space-test";
                    },
                };

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );
                await spaceRegistry.joinSpace(
                    newSpace.getName(),
                    FilterType.ALL_USERS,
                    [],
                    new AbortController().signal
                );
                expect(spaceRegistry.get(newSpace.getName())).toBeInstanceOf(Space);
            });
            it("should return a error when you try to add a space which already exist", async () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );
                await spaceRegistry.joinSpace(
                    newSpace.getName(),
                    FilterType.ALL_USERS,
                    [],
                    new AbortController().signal
                );
                await expect(
                    spaceRegistry.joinSpace(newSpace.getName(), FilterType.ALL_USERS, [], new AbortController().signal)
                ).rejects.toThrow(SpaceAlreadyExistError);
            });
        });
        describe("SpaceRegistry exist", () => {
            it("should return true when space is in store", async () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;

                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );

                await spaceRegistry.joinSpace(
                    newSpace.getName(),
                    FilterType.ALL_USERS,
                    [],
                    new AbortController().signal
                );

                const result: boolean = spaceRegistry.exist(newSpace.getName());

                expect(result).toBeTruthy();
            });
            it("should return false when space is in store", () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );
                const result: boolean = spaceRegistry.exist(newSpace.getName());
                expect(result).toBeFalsy();
            });
        });
        describe("SpaceRegistry delete", () => {
            it("should delete a space when space is in the store", async () => {
                const roomConnectionMock = new MockRoomConnectionForSpaces();
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(roomConnectionMock, new Subject());

                await spaceRegistry.joinSpace("space-test1", FilterType.ALL_USERS, [], new AbortController().signal);
                await spaceRegistry.joinSpace("space-test2", FilterType.ALL_USERS, [], new AbortController().signal);
                const spaceToDelete = await spaceRegistry.joinSpace(
                    "space-to-delete",
                    FilterType.ALL_USERS,
                    [],
                    new AbortController().signal
                );

                await spaceRegistry.leaveSpace(spaceToDelete);
                expect(spaceRegistry.getAll().find((space) => space.getName() === "space-to-delete")).toBeUndefined();
                expect(roomConnectionMock.emitLeaveSpace).toHaveBeenCalledOnce();
            });
            it("should return a error when you try to delete a space who is not in the space ", async () => {
                const newSpace: SpaceInterface = {
                    getName(): string {
                        return "space-test";
                    },
                } as SpaceInterface;
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(
                    defaultRoomConnectionMock,
                    new Subject()
                );

                await expect(spaceRegistry.leaveSpace(newSpace)).rejects.toThrow(SpaceDoesNotExistError);
            });
        });
        describe("SpaceRegistry destroy", () => {
            it("should destroy space store", async () => {
                const roomConnectionMock = new MockRoomConnectionForSpaces();
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(roomConnectionMock, new Subject());

                await spaceRegistry.joinSpace("space-test1", FilterType.ALL_USERS, [], new AbortController().signal);
                await spaceRegistry.joinSpace("space-test2", FilterType.ALL_USERS, [], new AbortController().signal);
                await spaceRegistry.joinSpace("space-test3", FilterType.ALL_USERS, [], new AbortController().signal);

                await spaceRegistry.destroy();
                expect(spaceRegistry.getAll()).toHaveLength(0);

                expect(roomConnectionMock.emitLeaveSpace).toHaveBeenCalledTimes(3);
            });
        });
        describe("SpaceRegistry race condition handling", () => {
            it("should handle race condition when leaving and joining the same space immediately", async () => {
                const roomConnectionMock = new MockRoomConnectionForSpaces();
                const spaceRegistry: SpaceRegistryInterface = new SpaceRegistry(roomConnectionMock, new Subject());

                // Join a space first
                const initialSpace = await spaceRegistry.joinSpace(
                    "race-condition-test",
                    FilterType.ALL_USERS,
                    [],
                    new AbortController().signal
                );
                expect(spaceRegistry.exist("race-condition-test")).toBeTruthy();

                // Add a delay to emitLeaveSpace to simulate async operation
                let leaveSpaceResolve: () => void;
                const leaveSpacePromise = new Promise<void>((resolve) => {
                    leaveSpaceResolve = resolve;
                });
                roomConnectionMock.emitLeaveSpace.mockImplementation(() => {
                    return leaveSpacePromise;
                });

                // Start leaving the space (this will be async)
                const leavePromise = spaceRegistry.leaveSpace(initialSpace);

                // Immediately try to join the same space again
                // This should wait for the leave operation to complete
                const rejoinPromise = spaceRegistry.joinSpace(
                    "race-condition-test",
                    FilterType.ALL_USERS,
                    [],
                    new AbortController().signal
                );

                // Complete the leave operation
                leaveSpaceResolve!();
                await leavePromise;

                // The rejoin should succeed without throwing an error
                const newSpace = await rejoinPromise;
                expect(newSpace.getName()).toBe("race-condition-test");
                expect(spaceRegistry.exist("race-condition-test")).toBeTruthy();
                expect(roomConnectionMock.emitLeaveSpace).toHaveBeenCalledOnce();
                expect(roomConnectionMock.emitJoinSpace).toHaveBeenCalledTimes(2);
            });
        });
    });
});
