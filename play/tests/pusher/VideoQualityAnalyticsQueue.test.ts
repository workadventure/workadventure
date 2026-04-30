import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    VideoQualityRelayProtocol,
    VideoQualityStreamCategory,
    VideoQualityTransportType,
    type VideoQualitySampleMessage,
} from "@workadventure/messages";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import {
    VideoQualityAnalyticsQueue,
    type VideoQualityAnalyticsBatch,
    type VideoQualityAnalyticsQueueConfig,
} from "../../src/pusher/services/VideoQualityAnalyticsQueue";

const baseConfig: VideoQualityAnalyticsQueueConfig = {
    adminApiUrl: "http://admin.test",
    adminApiToken: "analytics-key",
    flushIntervalMs: 0,
    timeoutMs: 500,
    maxQueueSize: 10,
    maxBatchSize: 10,
    pusherInstanceId: "pusher-test",
};

describe("VideoQualityAnalyticsQueue", () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it("does not queue samples until analytics is enabled from admin capabilities", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new VideoQualityAnalyticsQueue(baseConfig, post);

        queue.enqueueReport({ samples: [sample()] }, socketData());
        await queue.flush();

        expect(post).not.toHaveBeenCalled();
        expect(queue.getStats()).toMatchObject({
            queueSize: 0,
            samplesSent: 0,
        });
    });

    it("enriches and sends protobuf samples as admin batches", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new VideoQualityAnalyticsQueue(baseConfig, post, () => new Date("2026-04-24T12:00:06.000Z"));
        queue.setEnabled(true);

        queue.enqueueReport({ samples: [sample()] }, socketData());
        await queue.flush();

        expect(post).toHaveBeenCalledWith(
            "http://admin.test/api/analytics/video-quality-batch",
            expect.objectContaining({
                schemaVersion: 1,
                sentAt: "2026-04-24T12:00:06.000Z",
                pusherInstanceId: "pusher-test",
                samples: [
                    expect.objectContaining({
                        clientEventTime: "2026-04-24T12:00:05.000Z",
                        pusherReceivedAt: "2026-04-24T12:00:06.000Z",
                        reporterUserUuid: "reporter-uuid",
                        reporterUserId: 123,
                        reporterSpaceUserId: "reporter-space-user",
                        reporterClientIp: "203.0.113.10",
                        remoteUserUuid: "remote-uuid",
                        remoteSpaceUserId: "remote-space-user",
                        spaceName: "world.space",
                        world: "world",
                        roomId: "https://play.test/@/team/world/room",
                        tabId: "tab-id",
                        streamId: "stream-id",
                        streamCategory: "video",
                        transportType: "P2P",
                        relay: true,
                        relayProtocol: "udp",
                        livekitServerUrl: null,
                        fps: 24.5,
                        fpsStdDev: 3.5,
                        jitter: 0.07,
                        bandwidthBytesPerSecond: 180000,
                        frameWidth: 1280,
                        frameHeight: 720,
                        mimeType: "video/VP8",
                        sampleSeq: 1,
                        connectionId: "connection-id",
                        sessionId: "session-id",
                    }),
                ],
            }),
            {
                headers: {
                    Authorization: "Bearer analytics-key",
                    "Content-Type": "application/json",
                },
                timeout: 500,
            }
        );
        expect(queue.getStats()).toMatchObject({
            queueSize: 0,
            batchesSent: 1,
            samplesSent: 1,
        });
    });

    it("drops the oldest samples when the queue is full", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new VideoQualityAnalyticsQueue({ ...baseConfig, maxQueueSize: 2 }, post);
        queue.setEnabled(true);

        queue.enqueueReport({ samples: [sample({ sampleSeq: 1 })] }, socketData());
        queue.enqueueReport({ samples: [sample({ sampleSeq: 2 })] }, socketData());
        queue.enqueueReport({ samples: [sample({ sampleSeq: 3 })] }, socketData());
        await queue.flush();

        const batch = post.mock.calls[0][1] as VideoQualityAnalyticsBatch;
        expect(batch.samples.map((queuedSample) => queuedSample.sampleSeq)).toEqual([2, 3]);
        expect(queue.getStats()).toMatchObject({
            droppedOnOverflow: 1,
            samplesSent: 2,
        });
    });

    it("drops invalid samples without disconnecting or throwing", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const queue = new VideoQualityAnalyticsQueue(baseConfig, post);
        queue.setEnabled(true);

        queue.enqueueReport(
            {
                samples: [
                    sample({
                        spaceName: "other.space",
                    }),
                    sample({
                        streamCategory: VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_UNSPECIFIED,
                    }),
                ],
            },
            socketData()
        );
        await queue.flush();

        expect(post).not.toHaveBeenCalled();
        expect(queue.getStats()).toMatchObject({
            droppedInvalid: 2,
            queueSize: 0,
        });
        expect(consoleWarn).toHaveBeenCalledTimes(2);

        consoleWarn.mockRestore();
    });

    it("drops a failed batch after retry exhaustion", async () => {
        vi.useFakeTimers();
        const post = vi.fn().mockRejectedValue(new Error("admin unavailable"));
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const queue = new VideoQualityAnalyticsQueue(baseConfig, post, () => new Date("2026-04-24T12:00:06.000Z"));
        queue.setEnabled(true);

        queue.enqueueReport({ samples: [sample()] }, socketData());
        const flushPromise = queue.flush();
        await vi.advanceTimersByTimeAsync(300);
        await flushPromise;

        expect(post).toHaveBeenCalledTimes(2);
        expect(queue.getStats()).toMatchObject({
            droppedAfterSendFailure: 1,
            flushErrors: 1,
            queueSize: 0,
        });

        consoleWarn.mockRestore();
    });
});

function sample(overrides: Partial<VideoQualitySampleMessage> = {}): VideoQualitySampleMessage {
    return {
        clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
        sampleSeq: 1,
        streamId: "stream-id",
        connectionId: "connection-id",
        sessionId: "session-id",
        remoteUserUuid: "remote-uuid",
        remoteSpaceUserId: "remote-space-user",
        spaceName: "world.space",
        streamCategory: VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_VIDEO,
        transportType: VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_P2P,
        relay: true,
        relayProtocol: VideoQualityRelayProtocol.VIDEO_QUALITY_RELAY_PROTOCOL_UDP,
        livekitServerUrl: undefined,
        fps: 24.5,
        fpsStdDev: 3.5,
        jitter: 0.07,
        bandwidthBytesPerSecond: 180000,
        frameWidth: 1280,
        frameHeight: 720,
        mimeType: "video/VP8",
        ...overrides,
    };
}

function socketData(): SocketData {
    return {
        userUuid: "reporter-uuid",
        userId: 123,
        spaceUserId: "reporter-space-user",
        ipAddress: "203.0.113.10",
        roomId: "https://play.test/@/team/world/room",
        world: "world",
        spaces: new Set(["world.space"]),
        tabId: "tab-id",
    } as SocketData;
}
