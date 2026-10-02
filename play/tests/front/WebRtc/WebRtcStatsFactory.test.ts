import { describe, expect, it } from "vitest";
import { buildWebRtcSenderStatsFromReport, type SenderLayerPrev } from "../../../src/front/WebRtc/WebRtcStatsFactory";

function report(entries: Record<string, unknown>[]): RTCStatsReport {
    // RTCStatsReport is a ReadonlyMap<string, any>: a plain Map is one.
    return new Map(entries.map((entry) => [String(entry.id), entry]));
}

function layer(id: string, overrides: Record<string, unknown>): Record<string, unknown> {
    return {
        id,
        type: "outbound-rtp",
        kind: "video",
        codecId: "codec-av1",
        qualityLimitationReason: "none",
        encoderImplementation: "libaom",
        ...overrides,
    };
}

const codec = { id: "codec-av1", type: "codec", mimeType: "video/AV1" };

describe("buildWebRtcSenderStatsFromReport", () => {
    it("returns nothing when the report has no outbound video stream", () => {
        const prev = new Map<string, SenderLayerPrev>();
        expect(buildWebRtcSenderStatsFromReport(report([codec]), prev, "P2P")).toBeUndefined();
    });

    it("needs two reports to compute rates, then sums the layers and reads the largest one", () => {
        const prev = new Map<string, SenderLayerPrev>();

        const first = buildWebRtcSenderStatsFromReport(
            report([
                codec,
                layer("low", {
                    timestamp: 1000,
                    bytesSent: 1000,
                    framesEncoded: 10,
                    frameWidth: 640,
                    frameHeight: 360,
                }),
                layer("high", {
                    timestamp: 1000,
                    bytesSent: 5000,
                    framesEncoded: 20,
                    frameWidth: 1920,
                    frameHeight: 1080,
                }),
            ]),
            prev,
            "P2P",
        );
        expect(first).toBeUndefined();

        const second = buildWebRtcSenderStatsFromReport(
            report([
                codec,
                layer("low", {
                    timestamp: 3000,
                    bytesSent: 3000,
                    framesEncoded: 40,
                    frameWidth: 640,
                    frameHeight: 360,
                }),
                layer("high", {
                    timestamp: 3000,
                    bytesSent: 25000,
                    framesEncoded: 50,
                    frameWidth: 1920,
                    frameHeight: 1080,
                    qualityLimitationReason: "cpu",
                }),
            ]),
            prev,
            "P2P",
        );
        expect(second).toEqual({
            source: "P2P",
            frameWidth: 1920,
            frameHeight: 1080,
            mimeType: "video/AV1",
            // (2000 + 20000) bytes over 2 seconds
            bandwidth: 11000,
            // 30 frames of the largest layer over 2 seconds
            fps: 15,
            qualityLimitationReason: "cpu",
            encoderImplementation: "libaom",
        });
    });

    it("maps unknown limitation reasons to none and forgets removed layers", () => {
        const prev = new Map<string, SenderLayerPrev>();
        buildWebRtcSenderStatsFromReport(
            report([layer("a", { timestamp: 1000, bytesSent: 0, framesEncoded: 0 })]),
            prev,
            "Livekit",
        );
        const stats = buildWebRtcSenderStatsFromReport(
            report([layer("a", { timestamp: 2000, bytesSent: 500, framesEncoded: 5, qualityLimitationReason: "??" })]),
            prev,
            "Livekit",
        );
        expect(stats?.qualityLimitationReason).toBe("none");

        expect(buildWebRtcSenderStatsFromReport(report([]), prev, "Livekit")).toBeUndefined();
        expect(prev.size).toBe(0);
    });
});
