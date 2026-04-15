import * as Phaser from "phaser";
globalThis.Phaser = Phaser;

import { TimeoutError } from "@workadventure/shared-utils/src/Abort/TimeoutError";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FilterType, type SpaceUser } from "@workadventure/messages";
import { writable } from "svelte/store";
import { Space } from "../Space";
import { SpaceNameIsEmptyError } from "../Errors/SpaceError";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { recordingStore } from "../../Stores/RecordingStore";

// Mock the entire GameManager module
vi.mock("../../Phaser/Game/GameManager", () => ({
    gameManager: {
        getCurrentGameScene: vi.fn(() => ({
            getRemotePlayersRepository: () => ({
                getPlayer: vi.fn(),
            }),
            roomUrl: "test-room",
        })),
    },
}));

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
        screenSharingLocalVideoBox: writable(undefined),
        screenShareQualityStore: {
            subscribe: writable("recommended").subscribe,
            setQuality: vi.fn(),
        },
        screenSharingLocalMedia: writable(undefined),
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

const startRecordingSpy = vi.fn();
const stopRecordingSpy = vi.fn();

const defaultRoomConnectionMock = {
    emitJoinSpace: vi.fn(),
    emitLeaveSpace: vi.fn(),
    emitAddSpaceFilter: vi.fn(),
    emitRemoveSpaceFilter: vi.fn(),
    startRecording: startRecordingSpy,
    stopRecording: stopRecordingSpy,
} as unknown as RoomConnection;

const defaultPropertiesToSync = ["x", "y", "z"];
const signal = new AbortController().signal;

function createSpaceUser(overrides: Partial<SpaceUser> & Pick<SpaceUser, "spaceUserId">): SpaceUser {
    return {
        spaceUserId: overrides.spaceUserId,
        name: overrides.name ?? "",
        playUri: overrides.playUri ?? "",
        color: overrides.color ?? "",
        characterTextures: overrides.characterTextures ?? [],
        isLogged: overrides.isLogged ?? false,
        availabilityStatus: overrides.availabilityStatus ?? 0,
        roomName: overrides.roomName,
        visitCardUrl: overrides.visitCardUrl,
        tags: overrides.tags ?? [],
        cameraState: overrides.cameraState ?? false,
        microphoneState: overrides.microphoneState ?? false,
        screenSharingState: overrides.screenSharingState ?? false,
        megaphoneState: overrides.megaphoneState ?? false,
        jitsiParticipantId: overrides.jitsiParticipantId,
        uuid: overrides.uuid ?? "",
        chatID: overrides.chatID,
        showVoiceIndicator: overrides.showVoiceIndicator ?? false,
        attendeesState: overrides.attendeesState ?? false,
    };
}

describe("Space test", () => {
    beforeAll(() => {
        const WebSocketMock = vi.fn(() => {
            return {
                CONNECTING: 0,
                CLOSING: 2,
                CLOSED: 3,
            };
        });
        vi.stubGlobal("WebSocket", WebSocketMock);
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        recordingStore.reset();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it("should return a error when pass a empty string as spaceName", async () => {
        const spaceName = "";

        await expect(
            Space.create(
                spaceName,
                FilterType.ALL_USERS,
                defaultRoomConnectionMock,
                defaultPropertiesToSync,
                new AbortController().signal
            )
        ).rejects.toThrow(SpaceNameIsEmptyError);
    });
    it("should not return a error when pass a string as spaceName", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );
        expect(space.getName()).toBe(spaceName);
    });
    it("should emit joinSpace event when you create the space", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();
        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
        };

        await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            mockRoomConnection as unknown as RoomConnection,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitJoinSpace).toHaveBeenCalledWith(
            spaceName,
            FilterType.ALL_USERS,
            defaultPropertiesToSync,
            {
                signal: signal,
            }
        );
    });

    it("should emit leaveSpace event when you call destroy", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const mockRoomConnection = {
            emitJoinSpace: vi.fn(),
            emitLeaveSpace: vi.fn(),
        };

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            mockRoomConnection as unknown as RoomConnection,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

        await space.destroy();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenCalledOnce();

        expect(mockRoomConnection.emitLeaveSpace).toHaveBeenLastCalledWith(spaceName);
    });

    it("should resolve waitForSpaceUser immediately when the user already exists", async () => {
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );
        const addedUser = space.addUser(
            createSpaceUser({
                spaceUserId: "alice-id",
                name: "Alice",
            })
        );

        await expect(space.waitForSpaceUser("alice-id", 5_000)).resolves.toBe(addedUser);
    });

    it("should resolve waitForSpaceUser when the user joins later", async () => {
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );

        const userPromise = space.waitForSpaceUser("alice-id", 5_000);
        const addedUser = space.addUser(
            createSpaceUser({
                spaceUserId: "alice-id",
                name: "Alice",
            })
        );

        await expect(userPromise).resolves.toBe(addedUser);
    });

    it("should reject waitForSpaceUser when the user does not join before timeout", async () => {
        vi.useFakeTimers();
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );

        const userPromise = expect(space.waitForSpaceUser("missing-user", 5_000)).rejects.toBeInstanceOf(TimeoutError);

        await vi.advanceTimersByTimeAsync(5_000);

        await userPromise;
    });
    it("should show a named recording toast immediately when the recorder is already known", async () => {
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );
        space.addUser(
            createSpaceUser({
                spaceUserId: "alice-id",
                name: "Alice",
            })
        );
        const showInfoPopupSpy = vi.spyOn(recordingStore, "showInfoPopup");
        const showGenericInfoPopupSpy = vi.spyOn(recordingStore, "showGenericInfoPopup");

        space.setMetadata(
            new Map<string, unknown>([
                [
                    "recording",
                    {
                        recording: true,
                        recorder: "alice-id",
                    },
                ],
            ])
        );

        expect(showInfoPopupSpy).toHaveBeenCalledWith("Alice");
        expect(showGenericInfoPopupSpy).not.toHaveBeenCalled();
    });

    it("should show a generic recording toast after timeout and not upgrade it later", async () => {
        vi.useFakeTimers();
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );
        const showInfoPopupSpy = vi.spyOn(recordingStore, "showInfoPopup");
        const showGenericInfoPopupSpy = vi.spyOn(recordingStore, "showGenericInfoPopup");

        space.setMetadata(
            new Map<string, unknown>([
                [
                    "recording",
                    {
                        recording: true,
                        recorder: "alice-id",
                    },
                ],
            ])
        );

        await vi.advanceTimersByTimeAsync(5_000);

        expect(showGenericInfoPopupSpy).toHaveBeenCalledTimes(1);
        showInfoPopupSpy.mockClear();

        space.addUser(
            createSpaceUser({
                spaceUserId: "alice-id",
                name: "Alice",
            })
        );

        await Promise.resolve();

        expect(showInfoPopupSpy).not.toHaveBeenCalled();
    });

    it("should not show a recording toast while the recording is only starting", async () => {
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );

        const showInfoPopupSpy = vi.spyOn(recordingStore, "showInfoPopup");
        const showGenericInfoPopupSpy = vi.spyOn(recordingStore, "showGenericInfoPopup");

        space.setMetadata(
            new Map<string, unknown>([
                [
                    "recording",
                    {
                        recording: false,
                        recorder: "alice-id",
                        status: "starting",
                    },
                ],
            ])
        );

        expect(showInfoPopupSpy).not.toHaveBeenCalled();
        expect(showGenericInfoPopupSpy).not.toHaveBeenCalled();
    });

    it("should forward startRecording and stopRecording to the room connection", async () => {
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );

        await space.startRecording();
        await space.stopRecording();

        expect(startRecordingSpy).toHaveBeenCalledWith("space-name");
        expect(stopRecordingSpy).toHaveBeenCalledWith("space-name");
    });

    it("should add metadata when key is not in metadata map", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>();

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

        const newMetadata = new Map<string, unknown>([
            ["metadata-1", 0],
            ["metadata-2", "md2"],
            ["metadata-3", "md3"],
        ]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should update metadata when key is already in metadata map ", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

        const newMetadata = new Map<string, unknown>([["metadata-1", 0]]);

        space.setMetadata(newMetadata);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
    it("should not delete metadata who is in space data but not in newMetadata map ", async () => {
        const spaceName = "space-name";
        const metadata = new Map<string, unknown>([["metadata-1", 4]]);

        const space = await Space.create(
            spaceName,
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            defaultPropertiesToSync,
            signal,
            {
                metadata,
            }
        );

        const newMetadata = new Map<string, unknown>([
            ["metadata-2", 0],
            ["metadata-3", 0],
        ]);

        space.setMetadata(newMetadata);

        newMetadata.set("metadata-1", 4);

        const result = space.getMetadata();

        expect(result).toStrictEqual(newMetadata);
    });
});
