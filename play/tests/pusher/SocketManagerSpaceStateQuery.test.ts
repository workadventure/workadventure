import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { SocketManager } from "../../src/pusher/services/SocketManager";
import type { Query } from "../../src/pusher/models/SpaceQuery";
import type { SpaceInterface } from "../../src/pusher/models/Space";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

describe("SocketManager space state queries", () => {
    const createClient = (overrides: Partial<ReturnType<PusherWebSocket["getUserData"]>> = {}): PusherWebSocket => {
        const socketData = {
            canRecord: true,
            spaceUserId: "space-user-1",
            spaces: new Set<string>(["world.space-name"]),
            joinSpacesPromise: new Map<string, Promise<void>>(),
            ...overrides,
        };

        return mock<PusherWebSocket>({
            getUserData: vi.fn().mockReturnValue(socketData),
        });
    };

    const createManager = (querySend: (...args: unknown[]) => unknown): SocketManager => {
        const manager = new SocketManager();
        const space = mock<SpaceInterface>({
            name: "world.space-name",
            query: mock<Query>({
                send: querySend as Query["send"],
            }),
        });
        (manager as unknown as { spaces: Map<string, SpaceInterface> }).spaces.set("world.space-name", space);
        return manager;
    };

    it("rejects a recording query when the user cannot record", async () => {
        const querySend = vi.fn();
        const manager = createManager(querySend);

        await expect(
            manager.handleSpaceStateQuery(
                createClient({ canRecord: false }),
                "world.space-name",
                { query: { $case: "startRecording", startRecording: {} } },
                { signal: new AbortController().signal },
            ),
        ).rejects.toThrow("You are not allowed to record");
        expect(querySend).not.toHaveBeenCalled();
    });

    it("forwards a query with the socket space user id, and the recording timeout for recording", async () => {
        const querySend = vi.fn().mockResolvedValue({ $case: "spaceStateAnswer", spaceStateAnswer: {} });
        const manager = createManager(querySend);
        const signal = new AbortController().signal;
        const client = createClient({ canRecord: false });
        const raiseHand = { query: { $case: "raiseHand" as const, raiseHand: { raised: true } } };

        await manager.handleSpaceStateQuery(client, "world.space-name", raiseHand, { signal });
        await manager.handleSpaceStateQuery(
            createClient(),
            "world.space-name",
            { query: { $case: "stopRecording", stopRecording: {} } },
            { signal },
        );

        expect(querySend).toHaveBeenNthCalledWith(
            1,
            { $case: "spaceStateQuery", spaceStateQuery: { spaceUserId: "space-user-1", query: raiseHand } },
            { signal, timeout: undefined },
        );
        expect(querySend).toHaveBeenNthCalledWith(
            2,
            {
                $case: "spaceStateQuery",
                spaceStateQuery: {
                    spaceUserId: "space-user-1",
                    query: { query: { $case: "stopRecording", stopRecording: {} } },
                },
            },
            { signal, timeout: 60_000 },
        );
    });
});
