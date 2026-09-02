import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { PusherRoom } from "../../src/pusher/models/PusherRoom";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";
import type { ZoneEventListener } from "../../src/pusher/models/Zone";

describe("PusherRoom.isEmpty", () => {
    it("is not empty while a joined socket has not sent its viewport yet", () => {
        const room = new PusherRoom("/_/global/map.example.com/map.tmj", {} as ZoneEventListener);
        const socket = {
            getUserData: () => ({ listenedZones: new Set<string>(), pusherRoom: undefined }),
        } as unknown as PusherWebSocket;

        expect(room.isEmpty()).toBe(true);

        // Joined, but the first viewport (and therefore the first zone) has not arrived yet.
        room.join(socket);
        expect(room.isEmpty()).toBe(false);

        room.leave(socket);
        expect(room.isEmpty()).toBe(true);
    });
});
