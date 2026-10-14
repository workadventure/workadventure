import { get } from "svelte/store";
import { codecPerformance, demotedCodecStore, retryGranted, type CodecDirection } from "./CodecPerformance";
import { isAndroid, isIOS } from "./DeviceUtils";

export type VideoQualitySetting = "low" | "recommended" | "high";

export type VideoCodec = "av1" | "vp9" | "h264" | "vp8";

/**
 * Codecs we are willing to encode (or decode) with at a given frame size, best first. The transport keeps the first
 * one the browser supports.
 *
 * AV1 and VP9 are software encoders on most machines. A weak laptop cannot afford them at 720p, and the "low"
 * quality setting is the user telling us so; but the browser knows better than a rule: it remembers whether each
 * codec ran smoothly at that size on this machine (see CodecPerformance). A phone only gets a codec its hardware
 * handles.
 *
 * H.264 has a hardware encoder nearly everywhere (VideoToolbox, MediaFoundation, MediaCodec), but not in every
 * profile. P2P negotiates Baseline, which Chrome encodes in hardware from 360p up: there H.264 is the floor, and VP8
 * is left out. LiveKit only takes Constrained Baseline, which Chrome never encodes in hardware on macOS, nor by
 * default on Windows: that is OpenH264, run by libwebrtc on a single thread for every simulcast layer. So on LiveKit
 * the floor is VP8, software everywhere too but multithreaded, for the same bandwidth, and H.264 above it is only
 * kept where the browser reports a hardware encoder (the probe asks for Constrained Baseline) or says nothing.
 * Viewers lose their hardware decoder for it, which costs them little: they rarely receive more than one H.264 stream.
 *
 * A codec that could not keep up during this session (demotedCodecStore) is out, with every codec above it. The floor
 * stays: P2P keeps H.264, which only LiveKit demotes.
 */
export function preferredVideoCodecs(
    category: "video" | "screenSharing",
    quality: VideoQualitySetting,
    direction: CodecDirection,
    pixels: number,
    transport: "P2P" | "Livekit",
): VideoCodec[] {
    const mobile = isAndroid() || isIOS();
    const candidates: VideoCodec[] =
        category === "screenSharing" && quality !== "low" ? ["av1", "vp9", "h264"] : ["vp9", "h264"];
    if (transport === "Livekit") {
        candidates.push("vp8");
    }
    const floor = candidates[candidates.length - 1];
    const demoted = get(demotedCodecStore[category]);
    const start = demoted ? Math.min(candidates.indexOf(demoted) + 1, candidates.length - 1) : 0;
    return candidates.slice(start).filter((codec) => {
        if (codec === floor) {
            return true;
        }
        const performance = codecPerformance(direction, codec, pixels);
        if (codec === "h264") {
            // Above the floor, so on LiveKit: hardware, or nothing known (kept, as it always was), else VP8
            return !performance || performance.powerEfficient;
        }
        if (!performance) {
            // No verdict (probe pending, or a browser without the API): a desktop tries, a phone does not
            return !mobile;
        }
        if (mobile && !performance.powerEfficient) {
            return false;
        }
        return performance.supported && (performance.smooth || retryGranted(direction, codec));
    });
}

/**
 * The codec behind a negotiated mime type ("video/VP9"), if it is one we know.
 */
export function videoCodecFromMimeType(mimeType: string | undefined): VideoCodec | undefined {
    const codec = mimeType?.toLowerCase().split("/").pop();
    return codec === "av1" || codec === "vp9" || codec === "h264" || codec === "vp8" ? codec : undefined;
}

/**
 * What to negotiate on a P2P connection: a browser encodes whatever the peer asks for, so nothing we cannot afford
 * to encode may be negotiated at all. Ordered by what we prefer to decode.
 * Judged at 720p, the largest frame we may have to encode, since the set cannot change afterwards.
 *
 * An iPhone decodes VP9 in hardware but encodes it in software: this gives H.264 only, both ways.
 */
export function negotiableVideoCodecs(category: "video" | "screenSharing", quality: VideoQualitySetting): VideoCodec[] {
    const encodable = preferredVideoCodecs(category, quality, "encode", 1280 * 720, "P2P");
    return preferredVideoCodecs(category, quality, "decode", 1280 * 720, "P2P").filter((codec) =>
        encodable.includes(codec),
    );
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

// Fitted on the LiveKit bitrate guide (https://livekit.io/webrtc/bitrate-guide), within 20 % of its tables up to 1080p:
// "recommended" on the webcam one, "high" on the gaming one. "low" gets the bitrate of "recommended" at each size, and
// saves by capturing 360p (videoConstraintStore) and by its frame rate. Below what libwebrtc wants for a size (190 kbps
// for VP9 at 360p, 300 kbps for VP8), the encoder sends a smaller picture than the one we ask for.
const cameraCurve: BitrateCurve = {
    anchorCodec: "vp9",
    anchorPixels: 1280 * 720,
    anchor: { low: 700_000, recommended: 700_000, high: 1_800_000 },
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
 *
 * `spatialLayers` budgets an SVC stream, whose single maxBitrate covers every spatial layer, each half the size of the
 * next: each layer gets what it would get alone. The curve is a one-resolution budget, and short of the sum libwebrtc
 * keeps the top layer off: a 720p VP9 stream needs 891 kbps for its three layers, where the 720p layer alone is
 * budgeted 700 kbps.
 */
export function selectVideoPreset(
    displayHeight: number,
    displayWidth: number,
    isScreenShare: boolean,
    quality: VideoQualitySetting,
    codec: VideoCodec,
    spatialLayers = 1,
): {
    bitrate: number;
    fps: number;
} {
    const curve = isScreenShare ? screenShareCurve : cameraCurve;
    const pixels = Math.min(displayWidth * displayHeight, MAX_PIXELS);
    let bitrate = 0;
    for (let layer = 0; layer < spatialLayers; layer++) {
        bitrate += curve.anchor[quality] * Math.pow(pixels / 4 ** layer / curve.anchorPixels, curve.exponent);
    }
    bitrate *= BITRATE_FACTOR[codec] / BITRATE_FACTOR[curve.anchorCodec];
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
