import { isAndroid, isIOS } from "./DeviceUtils";

export type VideoQualitySetting = "low" | "recommended" | "high";

export type VideoCodec = "av1" | "vp9" | "h264" | "vp8";

/**
 * Codecs we are willing to encode with, best first. The transport keeps the first one the browser supports.
 *
 * AV1 and VP9 are software encoders on most machines. A phone cannot afford them, and neither can a weak laptop:
 * the "low" quality setting is the user telling us so. H.264 is the one codec with a hardware encoder nearly
 * everywhere (VideoToolbox, MediaFoundation, MediaCodec), so it is the fallback. VP8 is not listed: every browser
 * negotiates it anyway, and it is only ever software.
 */
export function preferredVideoCodecs(category: "video" | "screenSharing", quality: VideoQualitySetting): VideoCodec[] {
    if (isAndroid() || isIOS()) {
        return ["h264"];
    }
    if (category === "screenSharing" && quality !== "low") {
        return ["av1", "vp9", "h264"];
    }
    return ["vp9", "h264"];
}

/**
 * The codec behind a negotiated mime type ("video/VP9"), if it is one we know.
 */
export function videoCodecFromMimeType(mimeType: string | undefined): VideoCodec | undefined {
    const codec = mimeType?.toLowerCase().split("/").pop();
    return codec === "av1" || codec === "vp9" || codec === "h264" || codec === "vp8" ? codec : undefined;
}

// Bitrate needed for the same visual quality, relative to AV1. Each codec generation saves roughly 30 %; WebRTC
// negotiates constrained baseline H.264, which is VP8-class.
const BITRATE_FACTOR: Record<VideoCodec, number> = { av1: 1, vp9: 1.4, h264: 2, vp8: 2 };

// Frames above this size are budgeted as if they were this size
const MAX_PIXELS = 1920 * 1080;

/**
 * How the bitrate budget of a stream grows with its size: bitrate = anchor × (pixels / anchorPixels) ^ exponent,
 * a straight line on a log-log chart. Continuous on purpose: the P2P viewer reports arbitrary tile sizes that move
 * with the layout, and a stepped table jumps at every step.
 */
interface BitrateCurve {
    // Codec the anchors are expressed for
    anchorCodec: VideoCodec;
    anchorPixels: number;
    // Bitrate at anchorPixels, per quality setting
    anchor: Record<VideoQualitySetting, number>;
    // Natural video with motion and noise needs ~0.75, static screen content ~0.5
    exponent: number;
    fps: (pixels: number, quality: VideoQualitySetting) => number;
}

// Fitted on the LiveKit bitrate guide (https://livekit.io/webrtc/bitrate-guide): within 20 % of its table up to 1080p
const cameraCurve: BitrateCurve = {
    anchorCodec: "vp9",
    anchorPixels: 1280 * 720,
    anchor: { low: 400_000, recommended: 700_000, high: 1_800_000 },
    exponent: 0.75,
    // Small tiles are cheaper to watch at a lower frame rate
    fps: (pixels, quality) => {
        const large = pixels >= 1280 * 720;
        switch (quality) {
            case "low":
                return large ? 20 : 15;
            case "recommended":
                return large ? 30 : 20;
            case "high":
                return 30;
            default: {
                const _exhaustiveCheck: never = quality;
                throw new Error(`Unhandled quality setting: ${_exhaustiveCheck}`);
            }
        }
    },
};

const screenShareCurve: BitrateCurve = {
    anchorCodec: "av1",
    anchorPixels: MAX_PIXELS,
    anchor: { low: 1_000_000, recommended: 3_000_000, high: 4_500_000 },
    exponent: 0.5,
    fps: () => 30,
};

/**
 * Select the most appropriate bandwidth and fps for your resolution and the codec you encode with.
 */
export function selectVideoPreset(
    displayHeight: number,
    displayWidth: number,
    isScreenShare: boolean,
    quality: VideoQualitySetting,
    codec: VideoCodec,
): {
    bitrate: number;
    fps: number;
} {
    const curve = isScreenShare ? screenShareCurve : cameraCurve;
    const pixels = Math.min(displayWidth * displayHeight, MAX_PIXELS);
    const bitrate =
        curve.anchor[quality] *
        Math.pow(pixels / curve.anchorPixels, curve.exponent) *
        (BITRATE_FACTOR[codec] / BITRATE_FACTOR[curve.anchorCodec]);
    return { bitrate: Math.round(bitrate), fps: curve.fps(pixels, quality) };
}

/**
 * Maximum capture resolution of a screen share, per quality setting.
 *
 * AV1 has no hardware encoder on most machines, and nothing downstream ever lowers the published
 * resolution.
 */
export const screenShareMaxResolution: Record<VideoQualitySetting, MediaTrackConstraints> = {
    low: { width: { max: 1280 }, height: { max: 720 } },
    recommended: { width: { max: 1920 }, height: { max: 1080 } },
    high: { width: { max: 2560 }, height: { max: 1440 } },
};
