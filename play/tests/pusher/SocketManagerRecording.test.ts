import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import type { Socket } from "../../src/pusher/services/SocketManager";
import { SocketManager } from "../../src/pusher/services/SocketManager";
import type { Query } from "../../src/pusher/models/SpaceQuery";
import type { SpaceInterface } from "../../src/pusher/models/Space";

describe("SocketManager recording queries", () => {
    const createClient = (
        overrides: Partial<ReturnType<Socket["getUserData"]>> = {}
    ): Socket => {
        const socketData = {
            canRecord: true,
            spaceUserId: "space-user-1",
            spaces: new Set<string>(["world.space-name"]),
            joinSpacesPromise: new Map<string, Promise<void>>(),
            ...overrides,
        };

        return mock<Socket>({
            getUserData: vi.fn().mockReturnValue(socketData),
        });
    };

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
