import { describe, expect, it } from "vitest";
import { metadataProcessor } from "../../src/pusher/models/MetadataProcessorInit";
import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";

function createSocketData(overrides: Partial<SocketData> = {}): SocketData {
    return {
        rejected: false,
        disconnecting: false,
        token: "token",
        roomId: "room-id",
        userUuid: "user-uuid",
        isLogged: true,
        ipAddress: "127.0.0.1",
        name: "User",
        characterTextures: [],
        position: { x: 0, y: 0, direction: "down", moving: false },
        viewport: { left: 0, top: 0, right: 0, bottom: 0 },
        availabilityStatus: 0,
        tabId: undefined,
        messages: [],
        tags: [],
        visitCardUrl: null,
        userRoomToken: undefined,
        activatedInviteUser: undefined,
        canEdit: false,
        spaceUserId: "space-user-id",
        emitInBatch: () => undefined,
        batchedMessages: { event: "", payload: [] },
        batchTimeout: null,
        listenedZones: new Set(),
        pusherRoom: undefined,
        spaces: new Set(),
        joinSpacesPromise: new Map(),
        world: "world",
        currentChatRoomArea: [],
        roomName: "room-name",
        microphoneState: false,
        cameraState: false,
        attendeesState: false,
        queryAbortControllers: new Map(),
        canRecord: false,
        canTranscribe: false,
        keepAliveInterval: undefined,
        ...overrides,
    };
}

describe("pusher metadataProcessor transcription", () => {
    it("adds the current user as transcriber for valid start metadata", () => {
        const socketData = createSocketData({
            userUuid: "transcriber-uuid",
            canTranscribe: true,
        });

        const result = metadataProcessor.processMetadata("transcription", { transcription: true }, socketData);

        expect(result).toEqual({
            transcriber: "transcriber-uuid",
            transcription: true,
        });
    });

    it("rejects unauthorized transcription metadata", () => {
        const socketData = createSocketData({
            canTranscribe: false,
        });

        expect(() => metadataProcessor.processMetadata("transcription", { transcription: true }, socketData)).toThrow(
            "You are not allowed to transcribe"
        );
    });

    it("rejects invalid transcription metadata payloads", () => {
        const socketData = createSocketData({
            canTranscribe: true,
        });

        expect(() => metadataProcessor.processMetadata("transcription", { transcription: "yes" }, socketData)).toThrow(
            "Invalid transcription metadata"
        );
    });
});
