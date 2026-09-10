import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    chooseNegotiatedCodec,
    preferredVideoCodecs,
    selectVideoPreset,
    videoCodecFromMimeType,
    type VideoQualitySetting,
} from "./VideoPresets";
import { isAndroid, isIOS } from "./DeviceUtils";

vi.mock("./DeviceUtils", () => ({ isAndroid: vi.fn(() => false), isIOS: vi.fn(() => false) }));

describe("preferredVideoCodecs", () => {
    beforeEach(() => {
        vi.mocked(isAndroid).mockReturnValue(false);
        vi.mocked(isIOS).mockReturnValue(false);
    });

    it("keeps AV1 for a screen share unless the quality setting is low, with hardware H.264 as the fallback", () => {
        expect(preferredVideoCodecs("screenSharing", "recommended")).toEqual(["av1", "vp9", "h264"]);
        expect(preferredVideoCodecs("screenSharing", "low")).toEqual(["vp9", "h264"]);
        expect(preferredVideoCodecs("video", "high")).toEqual(["vp9", "h264"]);
    });

    it("only encodes H.264 on a phone", () => {
        vi.mocked(isAndroid).mockReturnValue(true);
        expect(preferredVideoCodecs("screenSharing", "high")).toEqual(["h264"]);
        expect(preferredVideoCodecs("video", "high")).toEqual(["h264"]);
    });
});

describe("selectVideoPreset", () => {
    // LiveKit bitrate guide (camera, expressed for VP9), the table the camera curve is fitted on
    const reference: [number, number, Record<VideoQualitySetting, number>][] = [
        [160, 90, { low: 20_000, recommended: 35_000, high: 80_000 }],
        [320, 180, { low: 50_000, recommended: 90_000, high: 210_000 }],
        [640, 360, { low: 150_000, recommended: 270_000, high: 550_000 }],
        [960, 540, { low: 260_000, recommended: 450_000, high: 1_100_000 }],
        [1280, 720, { low: 400_000, recommended: 700_000, high: 1_800_000 }],
        [1920, 1080, { low: 700_000, recommended: 1_200_000, high: 4_000_000 }],
    ];

    it("stays within 20 % of the LiveKit camera table", () => {
        for (const [width, height, bitrates] of reference) {
            for (const quality of ["low", "recommended", "high"] as const) {
                const { bitrate } = selectVideoPreset(height, width, false, quality, "vp9");
                expect(bitrate / bitrates[quality], `${width}x${height} ${quality}`).toBeGreaterThan(0.8);
                expect(bitrate / bitrates[quality], `${width}x${height} ${quality}`).toBeLessThan(1.2);
            }
        }
    });

    it("keeps the screen share budget: sqrt of the pixel ratio to 1080p, capped there", () => {
        expect(selectVideoPreset(1080, 1920, true, "recommended", "av1").bitrate).toBe(3_000_000);
        expect(selectVideoPreset(720, 1280, true, "recommended", "av1").bitrate).toBe(2_000_000);
        expect(selectVideoPreset(1440, 2560, true, "recommended", "av1").bitrate).toBe(3_000_000);
        expect(selectVideoPreset(1080, 1920, true, "low", "av1").bitrate).toBe(1_000_000);
        expect(selectVideoPreset(1080, 1920, true, "high", "av1").bitrate).toBe(4_500_000);
    });

    it("is continuous: a one pixel change does not jump", () => {
        const a = selectVideoPreset(360, 640, false, "recommended", "vp9").bitrate;
        const b = selectVideoPreset(361, 641, false, "recommended", "vp9").bitrate;
        expect(b / a).toBeLessThan(1.01);
    });

    it("budgets anything above 1080p like 1080p", () => {
        expect(selectVideoPreset(2160, 3840, false, "high", "vp9")).toEqual(
            selectVideoPreset(1080, 1920, false, "high", "vp9"),
        );
    });

    it("raises the bitrate for a cheaper codec", () => {
        const av1 = selectVideoPreset(1080, 1920, true, "recommended", "av1");
        const vp9 = selectVideoPreset(1080, 1920, true, "recommended", "vp9");
        const vp8 = selectVideoPreset(1080, 1920, true, "recommended", "vp8");
        expect(vp9.bitrate).toBe(4_200_000);
        expect(vp8.bitrate).toBe(6_000_000);
        expect(selectVideoPreset(1080, 1920, true, "recommended", "h264").bitrate).toBe(6_000_000);
        expect(vp8.fps).toBe(av1.fps);
        // The camera anchors are VP9 values
        expect(selectVideoPreset(720, 1280, false, "recommended", "vp9").bitrate).toBe(700_000);
        expect(selectVideoPreset(720, 1280, false, "recommended", "vp8").bitrate).toBe(1_000_000);
    });

    it("lowers the camera frame rate on small tiles", () => {
        expect(selectVideoPreset(360, 640, false, "low", "vp9").fps).toBe(15);
        expect(selectVideoPreset(720, 1280, false, "low", "vp9").fps).toBe(20);
        expect(selectVideoPreset(360, 640, false, "recommended", "vp9").fps).toBe(20);
        expect(selectVideoPreset(720, 1280, false, "recommended", "vp9").fps).toBe(30);
        expect(selectVideoPreset(90, 160, false, "high", "vp9").fps).toBe(30);
        expect(selectVideoPreset(360, 640, true, "low", "av1").fps).toBe(30);
    });
});

describe("chooseNegotiatedCodec", () => {
    const negotiated: RTCRtpCodec[] = [
        { mimeType: "video/VP8", clockRate: 90000 },
        { mimeType: "video/rtx", clockRate: 90000 },
        { mimeType: "video/H264", clockRate: 90000, sdpFmtpLine: "profile-level-id=42e01f;packetization-mode=1" },
        { mimeType: "video/H264", clockRate: 90000, sdpFmtpLine: "profile-level-id=42e01f;packetization-mode=0" },
        { mimeType: "video/VP9", clockRate: 90000, sdpFmtpLine: "profile-id=0" },
    ];

    it("takes the first preferred codec the peer negotiated, whatever its position", () => {
        expect(chooseNegotiatedCodec(["vp9", "h264"], negotiated)?.mimeType).toBe("video/VP9");
        expect(chooseNegotiatedCodec(["h264"], negotiated)?.sdpFmtpLine).toContain("packetization-mode=1");
        expect(chooseNegotiatedCodec(["av1", "vp9"], negotiated)?.mimeType).toBe("video/VP9");
    });

    it("gives up when nothing we prefer was negotiated", () => {
        expect(chooseNegotiatedCodec(["av1"], negotiated)).toBeUndefined();
        expect(chooseNegotiatedCodec(["h264"], [])).toBeUndefined();
    });
});

describe("videoCodecFromMimeType", () => {
    it("reads the negotiated codec", () => {
        expect(videoCodecFromMimeType("video/VP9")).toBe("vp9");
        expect(videoCodecFromMimeType("video/H264")).toBe("h264");
        expect(videoCodecFromMimeType("video/rtx")).toBeUndefined();
        expect(videoCodecFromMimeType(undefined)).toBeUndefined();
    });
});
