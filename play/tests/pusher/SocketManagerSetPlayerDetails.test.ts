import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { AvailabilityStatus, SetPlayerDetailsMessage } from "@workadventure/messages";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { SocketManager } from "../../src/pusher/services/SocketManager";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

describe("SocketManager.handleSetPlayerDetails", () => {
    it("keeps the latest status for the spaces the user joins later", async () => {
        const socketData = {
            availabilityStatus: AvailabilityStatus.ONLINE,
            spaces: new Set<string>(),
            backConnection: { write: vi.fn() },
        };
        const client = mock<PusherWebSocket>({ getUserData: vi.fn().mockReturnValue(socketData) });
        const manager = new SocketManager();

        await manager.handleSetPlayerDetails(
            client,
            SetPlayerDetailsMessage.fromPartial({ availabilityStatus: AvailabilityStatus.AWAY }),
        );
        expect(socketData.availabilityStatus).toBe(AvailabilityStatus.AWAY);

        // A message that only changes another detail leaves the status alone.
        await manager.handleSetPlayerDetails(client, SetPlayerDetailsMessage.fromPartial({ showVoiceIndicator: true }));
        expect(socketData.availabilityStatus).toBe(AvailabilityStatus.AWAY);
    });
});
