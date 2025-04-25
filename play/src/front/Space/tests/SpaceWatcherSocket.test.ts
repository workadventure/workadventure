import { describe, vi, expect, it } from "vitest";

import { UpdateSpaceMetadataMessage } from "@workadventure/messages";
import { Subject } from "rxjs";
import { SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import { RoomConnection } from "../../Connection/RoomConnection";
import { MockRoomConnectionForSpaces } from "./MockRoomConnectionForSpaces";

vi.mock("../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        wokaBase64(): Promise<string> {
            return Promise.resolve("");
        },
    };
});

vi.mock("../../Phaser/Game/GameManager", () => {
    return {};
});

vi.mock("../../Connection/ConnectionManager", () => {
    return {
        connectionManager: {
            roomConnectionStream: new Subject(),
        },
    };
});
// Mock the PeerStore module
vi.mock("../../Stores/PeerStore", () => ({
    peerStore: {
        getSpaceStore: vi.fn(),
        cleanupStore: vi.fn(),
        removePeer: vi.fn(),
        getPeer: vi.fn(),
    },
    screenSharingPeerStore: {
        getSpaceStore: vi.fn(),
        cleanupStore: vi.fn(),
        removePeer: vi.fn(),
        getPeer: vi.fn(),
    },
}));

// Mock SimplePeer
vi.mock("../../WebRtc/SimplePeer", () => ({
    SimplePeer: vi.fn().mockImplementation(() => ({
        closeAllConnections: vi.fn(),
        destroy: vi.fn(),
    })),
}));
describe("SpaceRegistry", () => {
    it("should call updateSpaceMetadata when stream updateSpaceMetadata receive a new message", () => {
        const roomConnection = new MockRoomConnectionForSpaces();

        const updateSpaceMetadataMessage: UpdateSpaceMetadataMessage = {
            spaceName: "space-name",
            filterName: "filter-name",
            metadata: JSON.stringify({
                metadata: "test",
            }),
        };

        const spaceRegistry = new SpaceRegistry(roomConnection as unknown as RoomConnection, new Subject());
        const space = spaceRegistry.joinSpace("space-name", []);

        roomConnection.updateSpaceMetadataMessageStream.next(updateSpaceMetadataMessage);

        expect(space.getMetadata().get("metadata")).toBe("test");
    });
});
