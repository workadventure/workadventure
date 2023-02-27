/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, expect, it } from "vitest";
import { SpaceSocketMock } from "./utils/SpaceSocketMock";
import { BackToPusherSpaceMessage } from "../src/Messages/generated/messages_pb";
import { SpacesWatcher } from "../src/Model/SpacesWatcher";
import { Space } from "../src/Model/Space";

describe("SpacesWatcher", () => {
    it(
        "should close the socket because no pong was answered to the ping within 20sec",
        async () => {
            const spaceSocketToPusher = new SpaceSocketMock();
            const eventsWatcher: BackToPusherSpaceMessage[] = [];
            spaceSocketToPusher.on("write", (message) => eventsWatcher.push(message));
            const watcher = new SpacesWatcher("uuid-watcher", spaceSocketToPusher);
            expect(eventsWatcher.some((message) => message.hasPingmessage())).toBe(true);

            let isClosed = false;
            spaceSocketToPusher.on("end", () => (isClosed = true));
            await new Promise((resolve) => setTimeout(resolve, 20_000));
            expect(isClosed).toBe(true);
        },
        { timeout: 30_000 }
    );
    it("should add/remove space to watcher", () => {
        const spaceSocketToPusher = new SpaceSocketMock();
        const watcher = new SpacesWatcher("uuid-watcher", spaceSocketToPusher);
        watcher.watchSpace("test-spaces-watcher");
        expect(watcher.spacesWatched).toContain("test-spaces-watcher");

        watcher.unwatchSpace("test-spaces-watcher");
        expect(watcher.spacesWatched).not.toContain("test-spaces-watcher");
    });
    it(
        "should not close the socket because pong was received to the ping",
        async () => {
            const spaceSocketToPusher = new SpaceSocketMock();
            // eslint-disable-next-line prefer-const
            let watcher: SpacesWatcher;
            spaceSocketToPusher.on("write", (message) => {
                if (message.hasPingmessage()) {
                    // If we received ping, we are faking pong
                    // Race condition SpacesWatcher.constructor is emitting this event and this event want the watcher to be constructed etc...
                    setTimeout(() => watcher?.receivedPong(), 0);
                }
            });
            watcher = new SpacesWatcher("uuid-watcher", spaceSocketToPusher);
            let isClosed = false;
            spaceSocketToPusher.on("end", () => (isClosed = true));
            await new Promise((resolve) => setTimeout(resolve, 45_000));
            expect(isClosed).toBe(false);
        },
        { timeout: 60_000 }
    );
});
