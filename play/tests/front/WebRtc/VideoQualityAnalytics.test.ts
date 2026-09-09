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
    it("does not emit reports without the video quality analytics capability", () => {
        window.capabilities = {};
        const sendReport = vi.fn();

        subscribeToVideoQualityAnalytics(writable(stats), context, sendReport);

        expect(sendReport).not.toHaveBeenCalled();
    });

    it("emits reports when the video quality analytics capability is present", () => {
        window.capabilities = {
            "api/analytics/video-quality-batch": "v1",
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
    };

    it("emits outbound samples carrying the encoder health", () => {
        window.capabilities = {
            "api/analytics/video-quality-batch": "v1",
        };
        const sendReport = vi.fn();

        subscribeToOutboundVideoQualityAnalytics(
            writable(senderStats),
            { ...context, transportType: "Livekit", remoteSpaceUserId: "", livekitServerUrl: "wss://livekit.test" },
            sendReport,
        );

        expect(sendReport).toHaveBeenCalledWith({
            samples: [
                expect.objectContaining({
                    direction: VideoQualityStreamDirection.VIDEO_QUALITY_STREAM_DIRECTION_OUTBOUND,
                    transportType: VideoQualityTransportType.VIDEO_QUALITY_TRANSPORT_TYPE_LIVEKIT,
                    remoteSpaceUserId: "",
                    livekitServerUrl: "wss://livekit.test",
                    fps: 28,
                    jitter: 0,
                    bandwidthBytesPerSecond: 300000,
                    frameWidth: 1920,
                    frameHeight: 1080,
                    mimeType: "video/AV1",
                    qualityLimitationReason: VideoQualityLimitationReason.VIDEO_QUALITY_LIMITATION_REASON_CPU,
                    encoderImplementation: "libaom",
                }),
            ],
        });
    });

    it("skips samples of a paused encoder", () => {
        window.capabilities = {
            "api/analytics/video-quality-batch": "v1",
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
