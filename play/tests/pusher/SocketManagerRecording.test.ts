import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import {
    getBackConnectionCloseReason,
    getBackConnectionSetupErrorReason,
    SocketManager,
} from "../../src/pusher/services/SocketManager";
import type { Query } from "../../src/pusher/models/SpaceQuery";
import type { SpaceInterface } from "../../src/pusher/models/Space";
import type { PusherWebSocket } from "../../src/pusher/services/PusherWebSocket";

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

describe("SocketManager recording queries", () => {
    it("rejects start recording when the user cannot record", async () => {
        const manager = new SocketManager();
        const client = createClient({ canRecord: false });
        const querySend = vi.fn();
        const space = mock<SpaceInterface>({
            name: "world.space-name",
            query: mock<Query>({
                send: querySend,
            }),
        });

        (manager as unknown as { spaces: Map<string, SpaceInterface> }).spaces.set("world.space-name", space);

        await expect(
            manager.handleStartRecording(client, "world.space-name", {
                signal: new AbortController().signal,
            })
        ).rejects.toThrow("You are not allowed to record");
        expect(querySend).not.toHaveBeenCalled();
    });

    it("forwards start and stop recording queries with the socket space user id and recording timeout", async () => {
        const manager = new SocketManager();
        const client = createClient();
        const signal = new AbortController().signal;
        const querySend = vi
            .fn()
            .mockResolvedValueOnce({
                $case: "startSpaceRecordingAnswer",
                startSpaceRecordingAnswer: {},
            })
            .mockResolvedValueOnce({
                $case: "stopSpaceRecordingAnswer",
                stopSpaceRecordingAnswer: {},
            });
        const space = mock<SpaceInterface>({
            name: "world.space-name",
            query: mock<Query>({
                send: querySend,
            }),
        });

        (manager as unknown as { spaces: Map<string, SpaceInterface> }).spaces.set("world.space-name", space);

        await manager.handleStartRecording(client, "world.space-name", { signal });
        await manager.handleStopRecording(client, "world.space-name", { signal });

        expect(querySend).toHaveBeenNthCalledWith(
            1,
            {
                $case: "startSpaceRecordingQuery",
                startSpaceRecordingQuery: {
                    spaceName: "world.space-name",
                    spaceUserId: "space-user-1",
                },
            },
            {
                signal,
                timeout: 60_000,
            }
        );
        expect(querySend).toHaveBeenNthCalledWith(
            2,
            {
                $case: "stopSpaceRecordingQuery",
                stopSpaceRecordingQuery: {
                    spaceName: "world.space-name",
                    spaceUserId: "space-user-1",
                },
            },
            {
                signal,
                timeout: 60_000,
            }
        );
    });
});

describe("SocketManager back connection close reasons", () => {
    it("uses an explicit diagnostic when the back stream ends without an application close reason", () => {
        expect(getBackConnectionCloseReason()).toBe(
            "Back connection ended without an application close reason (gRPC end event).",
        );
    });

    it("keeps gRPC error details when the stream errors before ending", () => {
        const grpcError = Object.assign(new Error("upstream reset"), {
            code: 14,
            details: "No connection established",
        });

        expect(getBackConnectionCloseReason(undefined, grpcError)).toBe(
            "Back connection ended after gRPC error: code=14 details=No connection established message=upstream reset",
        );
    });

    it("keeps setup error details when closing after connect or join failure", () => {
        expect(getBackConnectionSetupErrorReason(new Error("admin API timeout"))).toBe(
            "Error while connecting to back server: admin API timeout",
        );
    });
});
