import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import {
    VideoQualityLimitationReason,
    VideoQualityStreamCategory,
    VideoQualityStreamDirection,
    VideoQualityTransportType,
} from "@workadventure/messages";
import type { WebRtcSenderStats, WebRtcStats } from "../../../src/front/Components/Video/WebRtcStats";
import {
    subscribeToOutboundVideoQualityAnalytics,
    subscribeToVideoQualityAnalytics,
} from "../../../src/front/WebRtc/VideoQualityAnalytics";

const stats: WebRtcStats = {
    source: "P2P",
    frameWidth: 1280,
    frameHeight: 720,
    jitter: 0.07,
    bandwidth: 180000,
    fps: 24.5,
};

const context = {
    streamId: "stream-id",
    streamCategory: "video" as const,
    transportType: "P2P" as const,
    remoteSpaceUserId: "remote-space-user",
    spaceName: "world.space",
};

describe("subscribeToVideoQualityAnalytics", () => {
    it("does not emit reports without the generic analytics capability", () => {
        window.capabilities = {};
        const sendReport = vi.fn();

        subscribeToVideoQualityAnalytics(writable(stats), context, sendReport);

        expect(sendReport).not.toHaveBeenCalled();
    });

    it("emits reports when the generic analytics capability is present", () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();

        subscribeToVideoQualityAnalytics(writable(stats), context, sendReport);

        expect(sendReport).toHaveBeenCalledWith({
            samples: [
                expect.objectContaining({
                    streamId: "stream-id",
                    streamCategory: VideoQualityStreamCategory.VIDEO_QUALITY_STREAM_CATEGORY_VIDEO,
                    transportType: VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_P2P,
                    remoteSpaceUserId: "remote-space-user",
                    spaceName: "world.space",
                    direction: VideoQualityStreamDirection.VIDEO_QUALITY_STREAM_DIRECTION_INBOUND,
                }),
            ],
        });
    });

    it("reports what the browser counted between two samples", () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        vi.useFakeTimers();
        try {
            const sendReport = vi.fn();
            const playback = {
                statsId: "IT01V1",
                timestampMs: 1_000,
                framesDecoded: 100,
                freezeCount: 0,
                totalFreezesDuration: 0,
            };
            const store = writable<WebRtcStats>({ ...stats, playback });
            subscribeToVideoQualityAnalytics(store, context, sendReport);

            vi.advanceTimersByTime(5_000);
            store.set({
                ...stats,
                roundTripTimeMs: 120,
                playback: {
                    ...playback,
                    timestampMs: 6_000,
                    framesDecoded: 220,
                    freezeCount: 1,
                    totalFreezesDuration: 0.5,
                },
            });

            // The first sample has no previous one to diff against
            expect(sendReport.mock.calls[0][0].samples[0].windowSeconds).toBeUndefined();
            expect(sendReport.mock.calls[1][0].samples[0]).toMatchObject({
                windowSeconds: 5,
                framesDecoded: 120,
                freezeCount: 1,
                freezeSeconds: 0.5,
                roundTripTimeMs: 120,
            });
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("subscribeToOutboundVideoQualityAnalytics", () => {
    const senderStats: WebRtcSenderStats = {
        source: "Livekit",
        frameWidth: 1920,
        frameHeight: 1080,
        bandwidth: 300000,
        fps: 28,
        mimeType: "video/AV1",
        qualityLimitationReason: "cpu",
        encoderImplementation: "libaom",
        captureFps: 24,
        captureTargetFps: 30,
        encodeMsPerFrame: 12.5,
        cpuLimitedRatio: 0.4,
        bandwidthLimitedRatio: 0,
        uploadRoundTripTimeMs: 180,
        uploadLossRatio: 0.04,
        availableOutgoingBitrate: 1_200_000,
    };

    it("emits outbound samples carrying the encoder health", () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();

        subscribeToOutboundVideoQualityAnalytics(
            writable(senderStats),
            {
                ...context,
                transportType: "Livekit",
                remoteSpaceUserId: "",
                livekitServerUrl: "wss://livekit.test",
                getLivekitRegion: () => "ojohannesburg1a",
            },
            sendReport,
        );

        expect(sendReport).toHaveBeenCalledWith({
            samples: [
                expect.objectContaining({
                    direction: VideoQualityStreamDirection.VIDEO_QUALITY_STREAM_DIRECTION_OUTBOUND,
                    transportType: VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_LIVEKIT,
                    remoteSpaceUserId: "",
                    livekitServerUrl: "wss://livekit.test",
                    livekitRegion: "ojohannesburg1a",
                    fps: 28,
                    jitter: 0,
                    bandwidthBytesPerSecond: 300000,
                    frameWidth: 1920,
                    frameHeight: 1080,
                    mimeType: "video/AV1",
                    qualityLimitationReason: VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_CPU,
                    encoderImplementation: "libaom",
                    captureFps: 24,
                    captureTargetFps: 30,
                    encodeMsPerFrame: 12.5,
                    cpuLimitedRatio: 0.4,
                    bandwidthLimitedRatio: 0,
                    uploadRoundTripTimeMs: 180,
                    uploadLossRatio: 0.04,
                    availableOutgoingBitrate: 1_200_000,
                }),
            ],
        });
    });

    it("skips samples of a paused encoder", () => {
        window.capabilities = {
            "api/analytics/events-batch": "v1",
        };
        const sendReport = vi.fn();

        subscribeToOutboundVideoQualityAnalytics(
            writable({ ...senderStats, fps: 0, bandwidth: 0, qualityLimitationReason: "none" }),
            context,
            sendReport,
        );

        expect(sendReport).not.toHaveBeenCalled();
    });
});
