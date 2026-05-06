import { describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import { VideoQualityStreamCategory, VideoQualityTransportType } from "@workadventure/messages";
import type { WebRtcStats } from "../../../src/front/Components/Video/WebRtcStats";
import { subscribeToVideoQualityAnalytics } from "../../../src/front/WebRtc/VideoQualityAnalytics";

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
                }),
            ],
        });
    });
});
