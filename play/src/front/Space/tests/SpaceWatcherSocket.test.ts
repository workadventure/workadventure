import { describe, vi, expect, it } from "vitest";

import { FilterType, UpdateSpaceMetadataMessage } from "@workadventure/messages";
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

describe("SpaceRegistry", () => {
    it("should call updateSpaceMetadata when stream updateSpaceMetadata receive a new message", async () => {
        const roomConnection = new MockRoomConnectionForSpaces();

        const updateSpaceMetadataMessage: UpdateSpaceMetadataMessage = {
            spaceName: "space-name",
            metadata: JSON.stringify({
                metadata: "test",
            }),
        };

        const spaceRegistry = new SpaceRegistry(roomConnection as unknown as RoomConnection, new Subject());
        const space = await spaceRegistry.joinSpace("space-name", FilterType.ALL_USERS);

        roomConnection.updateSpaceMetadataMessageStream.next(updateSpaceMetadataMessage);

        expect(space.getMetadata().get("metadata")).toBe("test");
    });
});
