// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Enum/EnvironmentVariable.ts", () => import("../mocks/frontEnvironmentVariableMock"));
vi.mock("../../../src/front/Administration/AnalyticsClient", () => ({
    analyticsClient: { trackAdminEvent: vi.fn() },
}));
vi.mock("../../../src/front/Phaser/Game/GameManager", () => ({
    gameManager: { currentStartedRoom: { roomName: "room" } },
}));
vi.mock("../../../src/front/Connection/ConnectionManager", () => ({
    connectionManager: { tabId: "tab", unloading: false },
}));
// The stores RoomConnection reads in its constructor. Mocking them (and the modules below, which RoomConnection only
// touches in message handlers) keeps Phaser, the game scene and the media pipeline out of the import graph.
vi.mock("../../../src/front/Stores/MediaStore", async () => {
    const { writable } = await import("svelte/store");
    return { requestedCameraState: writable(false), requestedMicrophoneState: writable(false) };
});
vi.mock("../../../src/front/Stores/ScreenSharingStore", async () => {
    const { writable } = await import("svelte/store");
    return { requestedScreenSharingState: writable(false) };
});
vi.mock("../../../src/front/Phaser/Login/SelectCharacterScene", () => ({}));
vi.mock("../../../src/front/Phaser/Login/SelectCompanionScene", () => ({}));
vi.mock("../../../src/front/Stores/MenuStore", () => ({}));
vi.mock("../../../src/front/Stores/FollowStore", () => ({}));
vi.mock("../../../src/front/Stores/MegaphoneStore", () => ({}));
vi.mock("../../../src/front/Components/ActionBar/MenuIcons/megaphoneActions", () => ({}));

import { RoomConnection } from "../../../src/front/Connection/RoomConnection";
import { WorkAdventureWebSocket } from "../../../src/front/Connection/WorkAdventureWebSocket";

class FakeWebSocket extends EventTarget {
    public readyState: number = WebSocket.OPEN;
    public binaryType = "blob";
    public send = vi.fn();
    public close = vi.fn();
}

describe("RoomConnection", () => {
    afterEach(() => {
        WorkAdventureWebSocket.setWebsocketFactory(null);
    });

    it("does not leave an unhandled rejection when the socket is lost before the room is joined", async () => {
        let transport: FakeWebSocket | undefined;
        WorkAdventureWebSocket.setWebsocketFactory(() => {
            transport = new FakeWebSocket();
            return transport as unknown as WebSocket;
        });
        // `process` alone is the browser polyfill injected by the Vite config, whose on() does nothing.
        const nodeProcess = globalThis.process;
        const unhandledRejection = vi.fn();
        nodeProcess.on("unhandledRejection", unhandledRejection);

        try {
            const connection = new RoomConnection(null, "http://play.test/_/global/map.json", [], null);
            // The RoomConnectedMessage was received, the RoomJoinedMessage not yet: nobody awaits roomJoinedPromise.
            (connection as unknown as { roomConnectedMessageReceived: boolean }).roomConnectedMessageReceived = true;
            // 1008 (failed resume) is not retried by WorkAdventureWebSocket, so the close reaches the RoomConnection.
            transport?.dispatchEvent(new CloseEvent("close", { code: 1008, reason: "", wasClean: true }));
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });

            expect(unhandledRejection).not.toHaveBeenCalled();
            // A consumer awaiting it later (GameScene.joinRoom) still sees the close.
            await expect(connection.roomJoinedPromise).rejects.toBeInstanceOf(CloseEvent);
        } finally {
            nodeProcess.off("unhandledRejection", unhandledRejection);
        }
    });
});
