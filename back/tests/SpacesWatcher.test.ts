/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, expect, it } from "vitest";
import { SpaceSocketMock } from "./utils/SpaceSocketMock";
import { BackToPusherSpaceMessage } from "../src/Messages/generated/messages_pb";
import { SpacesWatcher } from "../src/Model/SpacesWatcher";

describe("SpacesWatcher", () => {
    const spaceSocketToPusher = new SpaceSocketMock();
    it(
        "should close the socket because no pong was answered to the ping within 20sec",
        async () => {
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
});
