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

    it("tells a source that delivers nothing from layers the sender switched off", () => {
        const prev = new Map<string, SenderLayerPrev>();
        const read = (timestamp: number, low: Record<string, unknown>, high: Record<string, unknown>) =>
            buildWebRtcSenderStatsFromReport(
                report([
                    layer("low", { timestamp, bytesSent: 0, frameWidth: 640, frameHeight: 360, ...low }),
                    layer("high", { timestamp, bytesSent: 0, frameWidth: 1280, frameHeight: 720, ...high }),
                ]),
                prev,
                "Livekit",
            );
        read(1000, { active: true, framesEncoded: 0 }, { active: false, framesEncoded: 100 });

        // Dynacast paused the high layer, nobody watching in HD: the low one still encodes
        const paused = read(2000, { active: true, framesEncoded: 30 }, { active: false, framesEncoded: 100 });
        expect(paused).toMatchObject({ fps: 0, activeLayers: 1, activeFps: 30 });

        // The camera froze: an active layer, and no frame
        const frozen = read(3000, { active: true, framesEncoded: 30 }, { active: false, framesEncoded: 100 });
        expect(frozen).toMatchObject({ activeLayers: 1, activeFps: 0 });

        // A browser that does not report `active` says nothing about it
        const unknown = read(4000, { framesEncoded: 30 }, { framesEncoded: 100 });
        expect(unknown?.activeLayers).toBeUndefined();
        expect(unknown?.activeFps).toBeUndefined();
    });

    it("reads the capture rate, the encoding time of all layers and the time spent limited", () => {
        const prev = new Map<string, SenderLayerPrev>();
        const read = (
            timestamp: number,
            frames: number,
            low: Record<string, unknown>,
            high: Record<string, unknown>,
        ): ReturnType<typeof buildWebRtcSenderStatsFromReport> =>
            buildWebRtcSenderStatsFromReport(
                report([
                    { id: "camera", type: "media-source", kind: "video", timestamp, frames },
                    layer("low", { timestamp, bytesSent: 0, frameWidth: 640, frameHeight: 360, ...low }),
                    layer("high", {
                        timestamp,
                        bytesSent: 0,
                        frameWidth: 1280,
                        frameHeight: 720,
                        mediaSourceId: "camera",
                        ...high,
                    }),
                ]),
                prev,
                "Livekit",
            );

        read(
            1000,
            100,
            { framesEncoded: 100, totalEncodeTime: 0.5 },
            { framesEncoded: 100, totalEncodeTime: 1.0, qualityLimitationDurations: { cpu: 3, bandwidth: 10 } },
        );
        const stats = read(
            2000,
            124,
            { framesEncoded: 124, totalEncodeTime: 0.62 },
            { framesEncoded: 124, totalEncodeTime: 1.36, qualityLimitationDurations: { cpu: 3.25, bandwidth: 10 } },
        );

        // A camera configured for 30 fps, delivering 24
        expect(stats?.captureFps).toBe(24);
        // (0.12 + 0.36) s for 48 frames
        expect(stats?.encodeMsPerFrame).toBeCloseTo(10);
        expect(stats?.cpuLimitedRatio).toBeCloseTo(0.25);
        expect(stats?.bandwidthLimitedRatio).toBe(0);
        // The media source survives between reports, not only the layers
        expect(prev.has("camera")).toBe(true);
    });

    it("leaves what the browser does not report undefined", () => {
        const prev = new Map<string, SenderLayerPrev>();
        buildWebRtcSenderStatsFromReport(report([layer("a", { timestamp: 1000, framesEncoded: 0 })]), prev, "P2P");
        const stats = buildWebRtcSenderStatsFromReport(
            report([layer("a", { timestamp: 2000, framesEncoded: 30 })]),
            prev,
            "P2P",
        );

        expect(stats?.captureFps).toBeUndefined();
        expect(stats?.encodeMsPerFrame).toBeUndefined();
        expect(stats?.cpuLimitedRatio).toBeUndefined();
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
