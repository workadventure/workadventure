import * as Phaser from "phaser";
globalThis.Phaser = Phaser;

import { TimeoutError } from "@workadventure/shared-utils/src/Abort/TimeoutError";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FilterType, type SpaceUser } from "@workadventure/messages";
import { get, writable } from "svelte/store";
import { Space } from "../Space";
import { SpaceNameIsEmptyError } from "../Errors/SpaceError";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { recordingStore } from "../../Stores/RecordingStore";
import type { StreamCategory, Streamable } from "../Streamable";
import type { StreamableSubjects } from "../SpacePeerManager/SpacePeerManager";
import type { PeerStatus } from "../../WebRtc/RemotePeer";
import { notificationPlayingStore } from "../../Stores/NotificationStore";

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
const videoPropertiesToSync = ["cameraState", "microphoneState", "screenSharingState"];
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

function createStreamable(uniqueId: string, spaceUserId: string, videoType: StreamCategory = "video"): Streamable {
    return {
        uniqueId,
        media: {
            type: "webrtc",
            streamStore: writable(undefined),
            isBlocked: writable(false),
            setDimensions: vi.fn(),
        },
        volumeStore: undefined,
        hasVideo: writable(true),
        hasAudio: writable(true),
        isMuted: writable(false),
        statusStore: writable<PeerStatus>("connected"),
        name: writable(uniqueId),
        showVoiceIndicator: writable(false),
        flipX: false,
        muteAudio: writable(false),
        displayMode: "cover",
        displayInPictureInPictureMode: false,
        usePresentationMode: false,
        spaceUserId,
        closeStreamable: vi.fn(),
        canCloseStreamable: () => false,
        volume: writable(1),
        videoType,
        webrtcStats: undefined,
    };
}

function getStreamableSubjects(space: Space): StreamableSubjects {
    return (space.spacePeerManager as unknown as { _streamableSubjects: StreamableSubjects })._streamableSubjects;
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
    it("should promote a pending video streamable when the active video peer is removed", async () => {
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            videoPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );
        const subjects = getStreamableSubjects(space);
        const activeStreamable = createStreamable("active-video", "alice-id");
        const pendingStreamable = createStreamable("pending-video", "alice-id");

        space.addUser(
            createSpaceUser({
                spaceUserId: "alice-id",
                name: "Alice",
                cameraState: true,
            })
        );

        subjects.videoPeerAdded.next(activeStreamable);
        subjects.videoPeerAdded.next(pendingStreamable);
        subjects.videoPeerRemoved.next(activeStreamable);

        const videoBox = space.getVideoPeerVideoBox("alice-id");
        expect(videoBox).toBeDefined();
        expect(get(videoBox?.streamables ?? writable([]))).toStrictEqual([
            {
                id: 1,
                streamable: pendingStreamable,
                isPending: false,
            },
        ]);
        expect(activeStreamable.closeStreamable).toHaveBeenCalledOnce();
        expect(pendingStreamable.closeStreamable).not.toHaveBeenCalled();
    });

    it("should keep the active video streamable when the pending video peer is removed", async () => {
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            videoPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );
        const subjects = getStreamableSubjects(space);
        const activeStreamable = createStreamable("active-video", "alice-id");
        const pendingStreamable = createStreamable("pending-video", "alice-id");

        space.addUser(
            createSpaceUser({
                spaceUserId: "alice-id",
                name: "Alice",
                cameraState: true,
            })
        );

        subjects.videoPeerAdded.next(activeStreamable);
        subjects.videoPeerAdded.next(pendingStreamable);
        subjects.videoPeerRemoved.next(pendingStreamable);

        const videoBox = space.getVideoPeerVideoBox("alice-id");
        expect(videoBox).toBeDefined();
        expect(get(videoBox?.streamables ?? writable([]))).toStrictEqual([
            {
                id: 0,
                streamable: activeStreamable,
                isPending: false,
            },
            {
                id: 1,
                streamable: pendingStreamable,
                isPending: true,
            },
        ]);
        expect(activeStreamable.closeStreamable).not.toHaveBeenCalled();
        expect(pendingStreamable.closeStreamable).not.toHaveBeenCalled();
    });

    it("should promote a pending screen-sharing streamable when the active screen-sharing peer is removed", async () => {
        const space = await Space.create(
            "space-name",
            FilterType.ALL_USERS,
            defaultRoomConnectionMock,
            videoPropertiesToSync,
            signal,
            {
                metadata: new Map<string, unknown>(),
            }
        );
        const subjects = getStreamableSubjects(space);
        const activeStreamable = createStreamable("active-screen-share", "alice-id", "screenSharing");
        const pendingStreamable = createStreamable("pending-screen-share", "alice-id", "screenSharing");

        space.initUsers([
            createSpaceUser({
                spaceUserId: "alice-id",
                name: "Alice",
                screenSharingState: true,
            }),
        ]);

        subjects.screenSharingPeerAdded.next(activeStreamable);
        subjects.screenSharingPeerAdded.next(pendingStreamable);
        subjects.screenSharingPeerRemoved.next(activeStreamable);

        const videoBox = space.getScreenSharingPeerVideoBox("alice-id");
        expect(videoBox).toBeDefined();
        expect(get(videoBox?.streamables ?? writable([]))).toStrictEqual([
            {
                id: 1,
                streamable: pendingStreamable,
                isPending: false,
            },
        ]);
        expect(activeStreamable.closeStreamable).toHaveBeenCalledOnce();
        expect(pendingStreamable.closeStreamable).not.toHaveBeenCalled();
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

    it("should show a private notification when recording stops unexpectedly", async () => {
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
        const playNotificationSpy = vi.spyOn(notificationPlayingStore, "playNotification");

        space.dispatchPrivateMessage({
            spaceName: "space-name",
            receiverUserId: "current-user-id",
            sender: createSpaceUser({
                spaceUserId: "alice-id",
                name: "Alice",
            }),
            spaceEvent: {
                event: {
                    $case: "recordingUnexpectedlyStoppedMessage",
                    recordingUnexpectedlyStoppedMessage: {},
                },
            },
        });

        expect(playNotificationSpy).toHaveBeenCalledTimes(1);
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
