/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, expect, it } from "vitest";
import { BackToPusherSpaceMessage } from "../src/Messages/generated/messages_pb";
import { SpacesWatcher } from "../src/Model/SpacesWatcher";
import { mock } from "vitest-mock-extended";
import { SpaceSocket } from "../src/SpaceManager";
import { Writable } from "stream";

describe("SpacesWatcher", () => {
    it(
        "should close the socket because no pong was answered to the ping within 20sec",
        async () => {
            const eventsWatcher: BackToPusherSpaceMessage[] = [];
            let isClosed = false;
            const spaceSocketToPusher = mock<SpaceSocket>({
                write(chunk: BackToPusherSpaceMessage): boolean {
                    eventsWatcher.push(chunk);
                    return true;
                },
                end(): ReturnType<Writable["end"]> extends Writable ? SpaceSocket : void {
                    isClosed = true;
                    return mock<SpaceSocket>();
                },
            });

            const watcher = new SpacesWatcher("uuid-watcher", spaceSocketToPusher);
            expect(eventsWatcher.some((message) => message.hasPingmessage())).toBe(true);

            await new Promise((resolve) => setTimeout(resolve, 20_000));
            expect(isClosed).toBe(true);
        },
        { timeout: 30_000 }
    );
    it("should add/remove space to watcher", () => {
        const spaceSocketToPusher = mock<SpaceSocket>();
        const watcher = new SpacesWatcher("uuid-watcher", spaceSocketToPusher);
        watcher.watchSpace("test-spaces-watcher");
        expect(watcher.spacesWatched).toContain("test-spaces-watcher");

        watcher.unwatchSpace("test-spaces-watcher");
        expect(watcher.spacesWatched).not.toContain("test-spaces-watcher");
    });
    it(
        "should not close the socket because pong was received to the ping",
        async () => {
            // eslint-disable-next-line prefer-const
            let watcher: SpacesWatcher;
            const spaceSocketToPusher = mock<SpaceSocket>({
                write(chunk: BackToPusherSpaceMessage): boolean {
                    if (chunk.hasPingmessage()) {
                        setTimeout(() => watcher?.receivedPong(), 0);
                    }
                    return true;
                },
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
