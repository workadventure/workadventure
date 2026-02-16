import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writable, get } from "svelte/store";
import { VideoBox } from "../VideoBox";
import type { Streamable } from "../Streamable";
import type { PeerStatus } from "../../WebRtc/RemotePeer";
import type { SpaceUserExtended } from "../SpaceInterface";
import type { WebRtcStreamable } from "../../Stores/StreamableCollectionStore";

// Mock Phaser globally
vi.mock("phaser", () => ({
    default: {},
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.Phaser = {} as any;

// Mock all the heavy modules
vi.mock("../../Phaser/Game/GameManager", () => ({
    gameManager: {
        getCurrentGameScene: vi.fn(() => ({
            getRemotePlayersRepository: () => ({
                getPlayer: vi.fn(),
            }),
            roomUrl: "test-room",
            CurrentPlayer: {
                pictureStore: writable(undefined),
            },
        })),
    },
}));

vi.mock("../../Connection/ConnectionManager", () => ({
    connectionManager: {
        currentRoom: null,
    },
}));

vi.mock("../../Connection/LocalUserStore", () => ({
    localUserStore: {
        isLogged: () => false,
        getLocalUser: () => ({ uuid: "test-uuid" }),
        getChatId: () => "test-chat-id",
        getName: () => "Test User",
    },
}));

vi.mock("../../Stores/MediaStore", () => ({
    availabilityStatusStore: writable(1),
}));

vi.mock("../../Administration/AnalyticsClient", () => ({
    analyticsClient: {
        identifyUser: vi.fn(),
        loggedWithSso: vi.fn(),
        loggedWithToken: vi.fn(),
        enteredRoom: vi.fn(),
        openedMenu: vi.fn(),
    },
}));

// Mock EnvironmentVariable
vi.mock("../../Enum/EnvironmentVariable.ts", () => {
    return {
        DEBUG_MODE: false,
        PUSHER_URL: "http://localhost",
        ADMIN_URL: "",
        UPLOADER_URL: "",
        ICON_URL: "",
        SKIP_RENDER_OPTIMIZATIONS: false,
        DISABLE_NOTIFICATIONS: false,
        JITSI_URL: "",
        JITSI_PRIVATE_MODE: false,
        ENABLE_MAP_EDITOR: true,
        MAX_USERNAME_LENGTH: 10,
        MAX_PER_GROUP: 4,
        MAX_DISPLAYED_VIDEOS: 9,
        NODE_ENV: "test",
        CONTACT_URL: "",
        POSTHOG_API_KEY: "test-api-key",
        POSTHOG_URL: "https://test.com",
        DISABLE_ANONYMOUS: false,
        ENABLE_OPENID: false,
        OPID_PROFILE_SCREEN_PROVIDER: "",
        ENABLE_CHAT_UPLOAD: false,
        FALLBACK_LOCALE: "en-US",
        OPID_WOKA_NAME_POLICY: "",
        ENABLE_REPORT_ISSUES_MENU: false,
        REPORT_ISSUES_URL: "",
        MINIMUM_DISTANCE: 64,
        POSITION_DELAY: 200,
        MAX_EXTRAPOLATION_TIME: 100,
        SENTRY_DSN_FRONT: "",
        SENTRY_ENVIRONMENT: "",
        SENTRY_RELEASE: "",
        SENTRY_TRACES_SAMPLE_RATE: 0,
        WOKA_SPEED: 60,
        FEATURE_FLAG_BROADCAST_AREAS: false,
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
        GOOGLE_DRIVE_PICKER_CLIENT_ID: "",
        GOOGLE_DRIVE_PICKER_APP_ID: "",
        PUBLIC_MAP_STORAGE_PREFIX: "",
        EMBEDLY_KEY: "",
        MATRIX_PUBLIC_URI: "",
        MATRIX_ADMIN_USER: "admin",
        MATRIX_DOMAIN: "domain",
        ENABLE_CHAT: true,
        ENABLE_CHAT_ONLINE_LIST: true,
        ENABLE_CHAT_DISCONNECTED_LIST: true,
        ENABLE_SAY: true,
        ENABLE_ISSUE_REPORT: false,
        GRPC_MAX_MESSAGE_SIZE: 4194304,
        TURN_CREDENTIALS_RENEWAL_TIME: 3600,
        BACKGROUND_TRANSFORMER_ENGINE: "none",
        DEFAULT_WOKA_NAME: "",
        DEFAULT_WOKA_TEXTURE: "",
        SKIP_CAMERA_PAGE: false,
        PROVIDE_DEFAULT_WOKA_NAME: false,
        PROVIDE_DEFAULT_WOKA_TEXTURE: false,
    };
});

// Mock i18n
vi.mock("../../i18n/i18n-svelte", () => {
    return {
        default: {
            subscribe: vi.fn(),
        },
    };
});

describe("VideoBox", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function createMockStreamable(initialStatus: PeerStatus = "connecting"): Streamable {
        const statusStore = writable<PeerStatus>(initialStatus);
        return {
            uniqueId: "test-streamable-id",
            statusStore,
            name: writable("Test User"),
            hasVideo: writable(true),
            hasAudio: writable(true),
            isMuted: writable(false),
            showVoiceIndicator: writable(false),
            flipX: false,
            muteAudio: writable(false),
            displayMode: "cover",
            displayInPictureInPictureMode: false,
            usePresentationMode: false,
            spaceUserId: "test-space-user",
            closeStreamable: vi.fn(),
            volume: writable(1),
            videoType: "camera",
            volumeStore: undefined,
            webrtcStats: undefined,
            media: {} as WebRtcStreamable,
        } as Streamable;
    }

    function createMockSpaceUser(): SpaceUserExtended {
        return {
            spaceUserId: "test-user-id",
            name: "Test User",
            playUri: "test-play-uri",
            color: "#000000",
            isMe: false,
            availabilityStatus: 1,
            uuid: "test-uuid",
            roomName: "test-room",
            visitCardUrl: null,
            characterTextures: [],
        } as SpaceUserExtended;
    }

    describe("State transitions", () => {
        it("should transition to 'reconnecting' when streamable status becomes 'connecting'", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            // Initial status should be "connected" from the streamable
            expect(get(videoBox.statusStore)).toBe("connected");

            // Act - Change streamable status to "connecting"
            mockStreamable.statusStore.set("connecting");

            // Assert - VideoBox should transition to "reconnecting"
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Cleanup
            videoBox.destroy();
        });

        it("should start 'reconnecting' when a new streamable with 'connecting' status is set", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connecting");
            const mockSpaceUser = createMockSpaceUser();

            // Act - Create VideoBox with a streamable that is already "connecting"
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            // Assert - VideoBox should keep initial "connecting" state (not transition to "reconnecting" since it's the first status)
            expect(get(videoBox.statusStore)).toBe("connecting");

            // Cleanup
            videoBox.destroy();
        });

        it("should transition from 'reconnecting' to 'connected' when connection is established", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Act - Transition to connecting (should become reconnecting)
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Then connection established
            mockStreamable.statusStore.set("connected");

            // Assert
            expect(get(videoBox.statusStore)).toBe("connected");

            // Cleanup
            videoBox.destroy();
        });

        it("should not change status when receiving the same status twice", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Act - Set the same status again
            mockStreamable.statusStore.set("connected");

            // Assert - Status should remain unchanged
            expect(get(videoBox.statusStore)).toBe("connected");

            // Cleanup
            videoBox.destroy();
        });
    });

    describe("Timeout behavior", () => {
        it("should transition to 'error' after 10 seconds when stuck in 'connecting' state", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Transition to connecting (which becomes reconnecting)
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Act - Advance time by 9999ms (just before timeout)
            vi.advanceTimersByTime(9999);

            // Assert - Should still be reconnecting
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Act - Advance time by 1ms more (10000ms total - timeout reached)
            vi.advanceTimersByTime(1);

            // Assert - Should now be in error state
            expect(get(videoBox.statusStore)).toBe("error");

            // Cleanup
            videoBox.destroy();
        });

        it("should not timeout if connection is established before 10 seconds", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Transition to connecting (which becomes reconnecting)
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Act - Advance time by 5 seconds
            vi.advanceTimersByTime(5000);

            // Connection established before timeout
            mockStreamable.statusStore.set("connected");

            // Advance time beyond original timeout
            vi.advanceTimersByTime(6000);

            // Assert - Should be connected, not error
            expect(get(videoBox.statusStore)).toBe("connected");

            // Cleanup
            videoBox.destroy();
        });

        it("should clear timeout when transitioning to any non-connecting status", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Transition to connecting (which becomes reconnecting)
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Act - Advance time by 5 seconds
            vi.advanceTimersByTime(5000);

            // Transition to error state (manual error, not timeout)
            mockStreamable.statusStore.set("error");

            // Advance time beyond original timeout
            vi.advanceTimersByTime(6000);

            // Assert - Should remain in error state (not changed by timeout)
            expect(get(videoBox.statusStore)).toBe("error");

            // Cleanup
            videoBox.destroy();
        });

        it("should not start multiple timeouts when receiving 'connecting' status multiple times", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            // Act - Trigger connecting state
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Advance time by 5 seconds
            vi.advanceTimersByTime(5000);

            // Trigger connecting state again
            mockStreamable.statusStore.set("connecting");

            // Advance time by 5 more seconds (10s total since first connecting)
            vi.advanceTimersByTime(5000);

            // Assert - Should be in error state (first timeout should have triggered)
            expect(get(videoBox.statusStore)).toBe("error");

            // Cleanup
            videoBox.destroy();
        });
    });

    describe("Multiple state transitions", () => {
        it("should handle connecting -> connected -> connecting -> connected cycle", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            // Initial state
            expect(get(videoBox.statusStore)).toBe("connected");

            // First reconnection attempt
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // First connection
            mockStreamable.statusStore.set("connected");
            expect(get(videoBox.statusStore)).toBe("connected");

            // Second reconnection attempt
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Second connection
            mockStreamable.statusStore.set("connected");
            expect(get(videoBox.statusStore)).toBe("connected");

            // Cleanup
            videoBox.destroy();
        });

        it("should handle timeout reset when reconnecting multiple times", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            // First reconnection attempt
            mockStreamable.statusStore.set("connecting");
            vi.advanceTimersByTime(5000);

            // Connected before timeout
            mockStreamable.statusStore.set("connected");
            expect(get(videoBox.statusStore)).toBe("connected");

            // Second reconnection attempt
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // This time, wait for full timeout
            vi.advanceTimersByTime(10000);

            // Assert - Should timeout on second attempt
            expect(get(videoBox.statusStore)).toBe("error");

            // Cleanup
            videoBox.destroy();
        });
    });

    describe("Cleanup behavior", () => {
        it("should clear timeout when destroy is called", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Transition to connecting (which becomes reconnecting)
            mockStreamable.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Act - Destroy before timeout
            videoBox.destroy();

            // Advance time beyond timeout
            vi.advanceTimersByTime(11000);

            // Assert - Status should still be reconnecting (timeout was cleared)
            expect(get(videoBox.statusStore)).toBe("reconnecting");
        });

        it("should unsubscribe from streamable status when destroy is called", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Act - Destroy VideoBox
            videoBox.destroy();

            // Try to change streamable status
            mockStreamable.statusStore.set("connecting");

            // Assert - VideoBox status should not change after destroy
            expect(get(videoBox.statusStore)).toBe("connected");
        });

        it("should unsubscribe from previous streamable when setNewStreamable is called", () => {
            // Arrange
            const mockStreamable1 = createMockStreamable("connected");
            const mockStreamable2 = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable1, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Act - Set new streamable
            videoBox.setNewStreamable(mockStreamable2);

            // Change old streamable status
            mockStreamable1.statusStore.set("error");

            // Assert - VideoBox should not react to old streamable
            expect(get(videoBox.statusStore)).toBe("connected");

            // Change new streamable status
            mockStreamable2.statusStore.set("connecting");

            // Assert - VideoBox should react to new streamable
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Cleanup
            videoBox.destroy();
        });

        it("should clear timeout when setNewStreamable is called", () => {
            // Arrange
            const mockStreamable1 = createMockStreamable("connected");
            const mockStreamable2 = createMockStreamable("connected");
            const mockSpaceUser = createMockSpaceUser();
            const videoBox = new VideoBox("test-id", mockSpaceUser, mockStreamable1, 1000, 0);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Transition to connecting (which becomes reconnecting)
            mockStreamable1.statusStore.set("connecting");
            expect(get(videoBox.statusStore)).toBe("reconnecting");

            // Advance time by 5 seconds
            vi.advanceTimersByTime(5000);

            // Act - Set new streamable (which is connected)
            videoBox.setNewStreamable(mockStreamable2);

            expect(get(videoBox.statusStore)).toBe("connected");

            // Advance time beyond original timeout
            vi.advanceTimersByTime(6000);

            // Assert - Should remain connected (old timeout was cleared)
            expect(get(videoBox.statusStore)).toBe("connected");

            // Cleanup
            videoBox.destroy();
        });
    });

    describe("Static factory methods", () => {
        it("should create VideoBox from local streamable", () => {
            // Arrange
            const mockStreamable = createMockStreamable("connected");

            // Act
            const videoBox = VideoBox.fromLocalStreamable(mockStreamable, -2);

            // Assert
            expect(videoBox.uniqueId).toBe("test-streamable-id");
            expect(videoBox.priority).toBe(-2);
            expect(get(videoBox.statusStore)).toBe("connected");

            // Cleanup
            videoBox.destroy();
        });

        it("should create VideoBox from remote space user", () => {
            // Arrange
            const mockSpaceUser = createMockSpaceUser();

            // Act
            const videoBox = VideoBox.fromRemoteSpaceUser(mockSpaceUser, false, false);

            // Assert
            expect(videoBox.uniqueId).toBe("test-user-id");
            expect(videoBox.spaceUser).toBe(mockSpaceUser);
            expect(videoBox.isMegaphoneSpace).toBe(false);

            // Cleanup
            videoBox.destroy();
        });

        it("should create VideoBox with screensharing prefix for screen sharing", () => {
            // Arrange
            const mockSpaceUser = createMockSpaceUser();

            // Act
            const videoBox = VideoBox.fromRemoteSpaceUser(mockSpaceUser, true, false);

            // Assert
            expect(videoBox.uniqueId).toBe("screensharing_test-user-id");

            // Cleanup
            videoBox.destroy();
        });
    });
});
