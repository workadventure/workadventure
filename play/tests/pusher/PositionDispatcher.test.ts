import { describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/node";
import { MAX_ZONES_PER_VIEWPORT, PositionDispatcher } from "../../src/pusher/models/PositionDispatcher";
import type { PusherRoom } from "../../src/pusher/models/PusherRoom";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";
import type { ZoneEventListener } from "../../src/pusher/models/Zone";

vi.mock("@sentry/node", () => ({
    captureMessage: vi.fn(),
    captureException: vi.fn(),
}));

function createDispatcher() {
    const pusherRoom = {
        subscribeToZone: vi.fn(),
        unsubscribeFromZone: vi.fn(),
    };

    const dispatcher = new PositionDispatcher(
        "http://play.workadventure.localhost/@/team/world/room",
        320,
        320,
        {} as ZoneEventListener,
        pusherRoom as unknown as PusherRoom,
    );

    const listenedZones = new Set<string>();
    const socket = {
        getUserData: () => ({ listenedZones }),
    } as unknown as PusherWebSocket;

    return { dispatcher, pusherRoom, socket, listenedZones };
}

describe("PositionDispatcher", () => {
    it("subscribes to the zones covered by a regular viewport", () => {
        const { dispatcher, pusherRoom, socket } = createDispatcher();

        // Roughly a 1080p screen plus the margin added by the front: 8x6 zones of 320px
        dispatcher.setViewport(socket, { left: 0, top: 0, right: 2520, bottom: 1680 });

        expect(pusherRoom.subscribeToZone).toHaveBeenCalledTimes(8 * 6);
    });

    it("ignores a viewport whose coordinates are inverted", () => {
        const { dispatcher, pusherRoom, socket } = createDispatcher();

        dispatcher.setViewport(socket, { left: 1000, top: 0, right: 0, bottom: 1000 });

        expect(pusherRoom.subscribeToZone).not.toHaveBeenCalled();
    });

    it("ignores a viewport whose coordinates are not finite", () => {
        const { dispatcher, pusherRoom, socket } = createDispatcher();

        dispatcher.setViewport(socket, { left: 0, top: 0, right: Number.NaN, bottom: 1000 });

        expect(pusherRoom.subscribeToZone).not.toHaveBeenCalled();
    });

    it("crops an oversized viewport around its center instead of subscribing to a huge number of zones", () => {
        const { dispatcher, pusherRoom, socket } = createDispatcher();

        // Such a viewport covers ~9.7 million zones. Before the guard, this froze the pusher in the subscription
        // loop and made the back accumulate enough zones to break Promise.all on disconnection.
        dispatcher.setViewport(socket, { left: 0, top: 0, right: 1_000_000, bottom: 1_000_000 });

        const subscribedZoneKeys = new Set(
            pusherRoom.subscribeToZone.mock.calls.map((call) => `${call[0]},${call[1]}`),
        );

        expect(subscribedZoneKeys.size).toBeLessThanOrEqual(MAX_ZONES_PER_VIEWPORT);
        // The window is still large enough to be useful, and centered on what the player is looking at.
        expect(subscribedZoneKeys.size).toBeGreaterThan(MAX_ZONES_PER_VIEWPORT / 2);
        expect(subscribedZoneKeys.has("1562,1562")).toBe(true);
        expect(subscribedZoneKeys.has("0,0")).toBe(false);
    });

    it("crops an oversized viewport that is extremely elongated", () => {
        const { dispatcher, pusherRoom, socket } = createDispatcher();

        // A single row of 3126 zones: cropping both sides by the same ratio is not enough here, the longest
        // side has to be trimmed on its own.
        dispatcher.setViewport(socket, { left: 0, top: 0, right: 1_000_000, bottom: 0 });

        expect(pusherRoom.subscribeToZone.mock.calls.length).toBeLessThanOrEqual(MAX_ZONES_PER_VIEWPORT);
        expect(pusherRoom.subscribeToZone.mock.calls.length).toBeGreaterThan(0);
    });

    it("only reports the first oversized viewport of a room", () => {
        const { dispatcher, socket } = createDispatcher();
        const captureMessage = vi.mocked(Sentry.captureMessage);
        captureMessage.mockClear();

        dispatcher.setViewport(socket, { left: 0, top: 0, right: 1_000_000, bottom: 1_000_000 });
        dispatcher.setViewport(socket, { left: 0, top: 0, right: 2_000_000, bottom: 2_000_000 });

        expect(captureMessage).toHaveBeenCalledTimes(1);
    });
});
