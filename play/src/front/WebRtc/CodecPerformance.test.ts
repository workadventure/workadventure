import { beforeAll, describe, expect, it, vi } from "vitest";
import { localUserStore } from "../Connection/LocalUserStore";
import { codecPerformance, codecSupportReport, probeCodecPerformance, retryGranted } from "./CodecPerformance";

// A machine with hardware H.264, software VP9 that keeps up until 720p, no AV1 verdict and no H.265
const fakeMediaCapabilities = {
    encodingInfo: (configuration: MediaEncodingConfiguration) => info(configuration.video, "encode"),
    decodingInfo: (configuration: MediaDecodingConfiguration) => info(configuration.video, "decode"),
} as unknown as MediaCapabilities;

function info(video: VideoConfiguration | undefined, direction: string): Promise<MediaCapabilitiesInfo> {
    if (!video || video.contentType === "video/AV1") {
        return Promise.reject(new Error("unsupported"));
    }
    if (video.contentType === "video/H265") {
        return Promise.resolve({ supported: false, smooth: false, powerEfficient: false });
    }
    if (video.contentType === "video/H264") {
        return Promise.resolve({ supported: true, smooth: true, powerEfficient: true });
    }
    return Promise.resolve({
        supported: true,
        smooth: video.width <= 1280 || direction === "decode",
        powerEfficient: false,
    });
}

describe("codecPerformance", () => {
    it("answers from the closest probed size below the requested one, 720p at least", async () => {
        await probeCodecPerformance(fakeMediaCapabilities);

        expect(codecPerformance("encode", "vp9", 1280 * 720)?.smooth).toBe(true);
        // Smaller frames are judged at 720p
        expect(codecPerformance("encode", "vp9", 533 * 300)?.smooth).toBe(true);
        expect(codecPerformance("encode", "vp9", 1920 * 1080)?.smooth).toBe(false);
        // 4K is judged at 1440p, the largest probed size below
        expect(codecPerformance("encode", "vp9", 3840 * 2160)?.smooth).toBe(false);
        expect(codecPerformance("decode", "vp9", 1280 * 720)?.smooth).toBe(true);
        expect(codecPerformance("encode", "h264", 1280 * 720)).toEqual({
            supported: true,
            smooth: true,
            powerEfficient: true,
        });
    });

    it("leaves a codec the browser rejected, or never probed, unknown", async () => {
        await probeCodecPerformance(fakeMediaCapabilities);

        expect(codecPerformance("encode", "av1", 1920 * 1080)).toBeUndefined();
        expect(codecPerformance("encode", "vp8", 1920 * 1080)).toBeUndefined();
    });

    it("reports each codec as hardware, software, unsupported or unknown", async () => {
        await probeCodecPerformance(fakeMediaCapabilities);
        vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
        );

        expect(codecSupportReport()).toEqual({
            browser: "edge",
            os: "windows",
            av1Encode: "unknown",
            av1Decode: "unknown",
            vp9Encode: "software",
            vp9Decode: "software",
            h264Encode: "hardware",
            h264Decode: "hardware",
            h265Encode: "unsupported",
            h265Decode: "unsupported",
        });
        vi.restoreAllMocks();
    });

    it("does nothing without the API", async () => {
        await expect(probeCodecPerformance(undefined)).resolves.toBeUndefined();
    });
});

describe("retryGranted", () => {
    const week = 7 * 24 * 60 * 60 * 1000;

    beforeAll(() => {
        localStorage.clear();
    });

    it("respects a fresh verdict and starts the clock", () => {
        expect(retryGranted("encode", "vp9")).toBe(false);
        expect(localUserStore.getCodecRetryTimes()["encode:vp9"]).toBeGreaterThan(0);
    });

    it("grants a retry after a week, once per session", () => {
        localUserStore.setCodecRetryTime("decode:vp9", Date.now() - week - 1000);

        expect(retryGranted("decode", "vp9")).toBe(true);
        expect(localUserStore.getCodecRetryTimes()["decode:vp9"]).toBeGreaterThan(Date.now() - 1000);
        // The session keeps its decision even though the clock was just restarted
        expect(retryGranted("decode", "vp9")).toBe(true);
    });

    it("waits when the last retry is recent", () => {
        localUserStore.setCodecRetryTime("encode:av1", Date.now() - 1000);

        expect(retryGranted("encode", "av1")).toBe(false);
    });
});
