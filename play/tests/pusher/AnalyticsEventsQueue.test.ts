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
    AnalyticsEventsQueue,
    type AnalyticsEventsBatch,
    type AnalyticsEventsQueueConfig,
} from "../../src/pusher/services/AnalyticsEventsQueue";

const baseConfig: AnalyticsEventsQueueConfig = {
    adminApiUrl: "http://admin.test",
    adminApiToken: "analytics-key",
    flushIntervalMs: 0,
    timeoutMs: 500,
    maxQueueSize: 10,
    maxBatchSize: 10,
    pusherInstanceId: "pusher-test",
};

describe("AnalyticsEventsQueue", () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it("enriches and sends generic events as admin batches", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new AnalyticsEventsQueue(baseConfig, post, () => new Date("2026-04-24T12:00:06.000Z"));
        queue.setEnabled(true);

        queue.enqueueEvent(
            {
                eventName: "user.connected",
                source: "pusher",
                clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
                eventId: "event-id",
                properties: {
                    connectionId: "connection-id",
                },
            },
            socketData(),
        );
        await queue.flush();

        expect(post).toHaveBeenCalledWith(
            "http://admin.test/api/analytics/events-batch",
            expect.objectContaining({
                schemaVersion: 1,
                sentAt: "2026-04-24T12:00:06.000Z",
                pusherInstanceId: "pusher-test",
                events: [
                    expect.objectContaining({
                        eventName: "user.connected",
                        source: "pusher",
                        clientEventTime: "2026-04-24T12:00:05.000Z",
                        pusherReceivedAt: "2026-04-24T12:00:06.000Z",
                        eventId: "event-id",
                        userUuid: "reporter-uuid",
                        userId: 123,
                        spaceUserId: "reporter-space-user",
                        clientIp: "203.0.113.10",
                        world: "world",
                        roomId: "https://play.test/@/team/world/room",
                        tabId: "tab-id",
                        properties: {
                            connectionId: "connection-id",
                        },
                    }),
                ],
            }),
            {
                headers: {
                    Authorization: "Bearer analytics-key",
                    "Content-Type": "application/json",
                },
                timeout: 500,
            },
        );
        expect(queue.getStats()).toMatchObject({
            queueSize: 0,
            batchesSent: 1,
            eventsSent: 1,
        });
    });

    it("does not queue events for worlds with admin analytics disabled", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new AnalyticsEventsQueue(baseConfig, post);
        queue.setEnabled(true);

        queue.enqueueEvent(
            {
                eventName: "user.connected",
                source: "pusher",
                clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
                eventId: "event-id",
                properties: {},
            },
            socketData({ analyticsEventsEnabled: false }),
        );
        await queue.flush();

        expect(post).not.toHaveBeenCalled();
        expect(queue.getStats()).toMatchObject({
            droppedByWorldSettings: 1,
            eventsSent: 0,
            queueSize: 0,
        });
    });

    it("does not queue events from disabled analytics metric categories", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new AnalyticsEventsQueue(baseConfig, post);
        queue.setEnabled(true);

        queue.enqueueEvent(
            {
                eventName: "chat.message_sent",
                source: "front",
                clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
                eventId: "event-id",
                properties: {},
            },
            socketData({
                analyticsMetricsPolicy: analyticsMetricsPolicy({
                    collaboration_activity: false,
                }),
            }),
        );
        await queue.flush();

        expect(post).not.toHaveBeenCalled();
        expect(queue.getStats()).toMatchObject({
            droppedByWorldSettings: 1,
            eventsSent: 0,
            queueSize: 0,
        });
    });

    it("anonymizes event identifiers when user-level activity metrics are disabled", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new AnalyticsEventsQueue(baseConfig, post, () => new Date("2026-04-24T12:00:06.000Z"));
        queue.setEnabled(true);

        queue.enqueueEvent(
            {
                eventName: "user.connected",
                source: "pusher",
                clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
                eventId: "event-id",
                properties: {
                    connectionId: "connection-id",
                },
            },
            socketData({
                analyticsMetricsPolicy: analyticsMetricsPolicy({
                    user_level_activity: false,
                }),
            }),
        );
        await queue.flush();

        const batch = post.mock.calls[0][1] as AnalyticsEventsBatch;
        expect(batch.events[0]).toMatchObject({
            eventName: "user.connected",
            userId: null,
            tabId: null,
            clientIp: null,
            properties: {},
        });
        expect(batch.events[0].userUuid).toMatch(/^anonymous:/);
        expect(batch.events[0].spaceUserId).toMatch(/^anonymous:/);
    });

    it("drops the oldest events when the queue is full", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new AnalyticsEventsQueue({ ...baseConfig, maxQueueSize: 2 }, post);
        queue.setEnabled(true);

        queue.enqueueEvent(event("event-1"), socketData());
        queue.enqueueEvent(event("event-2"), socketData());
        queue.enqueueEvent(event("event-3"), socketData());
        await queue.flush();

        const batch = post.mock.calls[0][1] as AnalyticsEventsBatch;
        expect(batch.events.map((queuedEvent) => queuedEvent.eventId)).toEqual(["event-2", "event-3"]);
        expect(queue.getStats()).toMatchObject({
            droppedOnOverflow: 1,
            eventsSent: 2,
        });
    });

    it("splits batches rejected by admin validation and drops only invalid events", async () => {
        const validationError = {
            isAxiosError: true,
            message: "Request failed with status code 422",
            response: {
                status: 422,
                data: {
                    errors: {
                        "events.1.properties": ["The events.1.properties field is required."],
                    },
                },
            },
        };
        const post = vi
            .fn()
            .mockRejectedValueOnce(validationError)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(validationError);
        const queue = new AnalyticsEventsQueue(baseConfig, post);
        queue.setEnabled(true);

        queue.enqueueEvent(event("valid-event", "area.entered"), socketData());
        queue.enqueueEvent(event("invalid-event", "status.changed"), socketData());
        await queue.flush();

        expect(post).toHaveBeenCalledTimes(3);
        expect((post.mock.calls[1][1] as AnalyticsEventsBatch).events).toHaveLength(1);
        expect((post.mock.calls[1][1] as AnalyticsEventsBatch).events[0].eventName).toBe("area.entered");
        expect((post.mock.calls[2][1] as AnalyticsEventsBatch).events).toHaveLength(1);
        expect((post.mock.calls[2][1] as AnalyticsEventsBatch).events[0].eventName).toBe("status.changed");
        expect(queue.getStats()).toMatchObject({
            droppedInvalid: 1,
            eventsSent: 1,
            flushErrors: 0,
        });
    });

    it("keeps the batch failure when an individual retry fails outside validation", async () => {
        const validationError = {
            isAxiosError: true,
            message: "Request failed with status code 422",
            response: { status: 422 },
        };
        const serverError = {
            isAxiosError: true,
            message: "Request failed with status code 500",
            response: { status: 500 },
        };
        const post = vi
            .fn()
            .mockRejectedValueOnce(validationError)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(serverError);
        const queue = new AnalyticsEventsQueue(baseConfig, post);
        queue.setEnabled(true);

        queue.enqueueEvent(event("valid-event", "area.entered"), socketData());
        queue.enqueueEvent(event("server-error-event", "status.changed"), socketData());
        await queue.flush();

        expect(queue.getStats()).toMatchObject({
            droppedAfterSendFailure: 2,
            eventsSent: 0,
            flushErrors: 1,
        });
    });

    it("converts video quality reports to generic media events", async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const queue = new AnalyticsEventsQueue(baseConfig, post, () => new Date("2026-04-24T12:00:06.000Z"));
        queue.setEnabled(true);

        queue.enqueueVideoQualityReport(
            { samples: [videoQualitySample({ spaceName: "http://play.test/@/team/world/room#1#123" })] },
            socketData(),
        );
        await queue.flush();

        const batch = post.mock.calls[0][1] as AnalyticsEventsBatch;
        expect(batch.events[0]).toMatchObject({
            eventName: "media.video_quality.sample",
            source: "media",
            clientEventTime: "2026-04-24T12:00:05.000Z",
            properties: expect.objectContaining({
                streamId: "stream-id",
                remoteUserUuid: "remote-uuid",
                remoteSpaceUserId: "remote-space-user",
                spaceName: "http://play.test/@/team/world/room#1#123",
                streamCategory: "video",
                transportType: "P2P",
                fps: 24.5,
                jitter: 0.07,
            }),
        });
    });
});

function event(eventId: string, eventName = "user.connected") {
    return {
        eventName,
        source: "pusher" as const,
        clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
        eventId,
        properties: {},
    };
}

function socketData(overrides: Partial<SocketData> & { analyticsEventsEnabled?: boolean } = {}): SocketData {
    return {
        userUuid: "reporter-uuid",
        userId: 123,
        spaceUserId: "reporter-space-user",
        ipAddress: "203.0.113.10",
        roomId: "https://play.test/@/team/world/room",
        world: "world",
        spaces: new Set(["world.space"]),
        tabId: "tab-id",
        analyticsEventsEnabled: true,
        analyticsMetricsPolicy: analyticsMetricsPolicy(),
        ...overrides,
    } as SocketData;
}

function analyticsMetricsPolicy(categories: Partial<Record<string, boolean>> = {}) {
    return {
        schemaVersion: 1,
        legalTemplateVersion: "2026-06-23.v1",
        categories: {
            presence_sessions: true,
            collaboration_activity: true,
            workspace_actions: true,
            quality_diagnostics: true,
            user_level_activity: true,
            ...categories,
        },
    };
}

function videoQualitySample(overrides: Partial<VideoQualitySampleMessage> = {}): VideoQualitySampleMessage {
    return {
        clientEventTimeMs: Date.parse("2026-04-24T12:00:05.000Z"),
        sampleSeq: 1,
        streamId: "stream-id",
        connectionId: "connection-id",
        sessionId: "session-id",
        remoteUserUuid: "remote-uuid",
        remoteSpaceUserId: "remote-space-user",
        spaceName: "space",
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
