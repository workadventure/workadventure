import { beforeAll, describe, expect, it } from "vitest";
import { localUserStore } from "../Connection/LocalUserStore";
import {
    canSelectSendCodec,
    codecPerformance,
    probeCodecPerformance,
    probeSendCodecSelection,
    retryGranted,
} from "./CodecPerformance";

// A machine with hardware H.264, software VP9 that keeps up until 360p, and no AV1 at all
const fakeMediaCapabilities = {
    encodingInfo: (configuration: MediaEncodingConfiguration) => info(configuration.video, "encode"),
    decodingInfo: (configuration: MediaDecodingConfiguration) => info(configuration.video, "decode"),
} as unknown as MediaCapabilities;

function info(video: VideoConfiguration | undefined, direction: string): Promise<MediaCapabilitiesInfo> {
    if (!video || video.contentType === "video/AV1") {
        return Promise.reject(new Error("unsupported"));
    }
    if (video.contentType === "video/H264") {
        return Promise.resolve({ supported: true, smooth: true, powerEfficient: true });
    }
    return Promise.resolve({
        supported: true,
        smooth: video.width <= 640 || direction === "decode",
        powerEfficient: false,
    });
}

describe("codecPerformance", () => {
    it("answers from the closest probed size below the requested one", async () => {
        await probeCodecPerformance(fakeMediaCapabilities);

        expect(codecPerformance("encode", "vp9", 640 * 360)?.smooth).toBe(true);
        // 533x300: judged at 320x180, the largest probed size below
        expect(codecPerformance("encode", "vp9", 533 * 300)?.smooth).toBe(true);
        expect(codecPerformance("encode", "vp9", 1280 * 720)?.smooth).toBe(false);
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

    it("does nothing without the API", async () => {
        await expect(probeCodecPerformance(undefined)).resolves.toBeUndefined();
    });
});

describe("probeSendCodecSelection", () => {
    // A connection whose sender reacts to setParameters() as instructed
    const fakePeerConnection = (setParameters: () => Promise<void>) =>
        class {
            public close = () => undefined;
            public addTransceiver() {
                return { sender: { getParameters: () => ({ encodings: [{}] }), setParameters } };
            }
        } as unknown as typeof RTCPeerConnection;

    const failure = (name: string) => {
        const e = new Error(name);
        e.name = name;
        return Promise.reject(e);
    };

    it("detects a browser that validates the codec field", async () => {
        expect(await probeSendCodecSelection(fakePeerConnection(() => failure("InvalidModificationError")))).toBe(true);
        expect(canSelectSendCodec()).toBe(true);
    });

    it("treats a browser that ignores the field, or fails otherwise, as unsupported", async () => {
        expect(await probeSendCodecSelection(fakePeerConnection(() => Promise.resolve()))).toBe(false);
        expect(canSelectSendCodec()).toBe(false);
        expect(await probeSendCodecSelection(fakePeerConnection(() => failure("InvalidStateError")))).toBe(false);
        expect(await probeSendCodecSelection(undefined)).toBe(false);
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
