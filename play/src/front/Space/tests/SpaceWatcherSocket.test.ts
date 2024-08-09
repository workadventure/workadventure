import { describe, vi, expect, it } from "vitest";

import {
    AddSpaceUserMessage,
    RemoveSpaceUserMessage,
    UpdateSpaceMetadataMessage,
    UpdateSpaceUserMessage,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { SpaceRegistry } from "../SpaceRegistry/SpaceRegistry";
import { RoomConnection } from "../../Connection/RoomConnection";

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

class MockRoomConnection {
    public addSpaceUserMessageStream = new Subject<AddSpaceUserMessage>();
    public updateSpaceUserMessageStream = new Subject<UpdateSpaceUserMessage>();
    public removeSpaceUserMessageStream = new Subject<RemoveSpaceUserMessage>();
    public updateSpaceMetadataMessageStream = new Subject<UpdateSpaceMetadataMessage>();

    public emitWatchSpace() {}
    // Add any other methods or properties that need to be mocked
}

describe("SpaceRegistry", () => {
    it("should call updateSpaceMetadata when stream updateSpaceMetadata receive a new message", () => {
        const roomConnection = new MockRoomConnection();

        const updateSpaceMetadataMessage: UpdateSpaceMetadataMessage = {
            spaceName: "space-name",
            filterName: "filter-name",
            metadata: JSON.stringify({
                metadata: "test",
            }),
        };

        const spaceRegistry = new SpaceRegistry(roomConnection as unknown as RoomConnection);
        const space = spaceRegistry.joinSpace("space-name");

        roomConnection.updateSpaceMetadataMessageStream.next(updateSpaceMetadataMessage);

        expect(space.getMetadata().get("metadata")).toBe("test");
    });
});
