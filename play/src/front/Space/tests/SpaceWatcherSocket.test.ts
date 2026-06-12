import * as Phaser from "phaser";
globalThis.Phaser = Phaser;

import { describe, vi, expect, it } from "vitest";

import type { UpdateSpaceMetadataMessage } from "@workadventure/messages";
import { FilterType } from "@workadventure/messages";
import { Subject } from "rxjs";
import { writable } from "svelte/store";
import { SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import { MockRoomConnectionForSpaces } from "./MockRoomConnectionForSpaces";

vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        wokaBase64(): Promise<string> {
            return Promise.resolve("");
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

vi.mock("../../Connection/ConnectionManager", () => {
    return {
        connectionManager: {
            roomConnectionStream: new Subject(),
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
        screenSharingLocalVideoBox: writable(undefined),
        screenSharingLocalMedia: writable(undefined),
        screenShareQualityStore: {
            subscribe: writable("recommended").subscribe,
            setQuality: vi.fn(),
        },
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

vi.mock(
    "../../Enum/EnvironmentVariable.ts",
    () => import("../../../../tests/front/mocks/frontEnvironmentVariableMock"),
);

describe("SpaceRegistry", () => {
    it("should call updateSpaceMetadata when stream updateSpaceMetadata receive a new message", async () => {
        const roomConnection = new MockRoomConnectionForSpaces();

        const updateSpaceMetadataMessage: UpdateSpaceMetadataMessage = {
            spaceName: "space-name",
            metadata: JSON.stringify({
                metadata: "test",
            }),
        };

        const spaceRegistry = new SpaceRegistry(roomConnection, new Subject());
        const space = await spaceRegistry.joinSpace(
            "space-name",
            FilterType.ALL_USERS,
            [],
            new AbortController().signal,
        );

        roomConnection.updateSpaceMetadataMessageStream.next(updateSpaceMetadataMessage);

        expect(space.getMetadata().get("metadata")).toBe("test");
    });
});
