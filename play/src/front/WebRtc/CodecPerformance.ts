import { localUserStore } from "../Connection/LocalUserStore";
import type { VideoCodec } from "./VideoPresets";

/**
 * What the browser knows about encoding and decoding each codec on this machine, asked through
 * `MediaCapabilities` with `type: "webrtc"`.
 *
 * In Chromium, `powerEfficient` means a hardware encoder or decoder exists for the codec, and `smooth` comes from a
 * per-profile history of real WebRTC sessions: the 99th percentile of the processing time per frame, per codec and
 * frame size, recorded only while a single encoder runs. With no history the answer is optimistic. Safari answers the
 * WebRTC type too (an iPhone 14 reports hardware VP9 decoding, software VP9 encoding, hardware H.264 both ways, no
 * AV1); a browser without the API leaves everything unknown.
 */

export type CodecDirection = "encode" | "decode";

export interface CodecPerformance {
    supported: boolean;
    smooth: boolean;
    powerEfficient: boolean;
}

const PROBED_CODECS = ["av1", "vp9", "h264"] as const;
type ProbedCodec = (typeof PROBED_CODECS)[number];

const CONTENT_TYPES: Record<ProbedCodec, string> = { av1: "video/AV1", vp9: "video/VP9", h264: "video/H264" };

// The sizes we decide at: 720p for a P2P connection and a LiveKit camera, larger LiveKit screen share captures
const PROBED_SIZES: [number, number][] = [
    [1280, 720],
    [1920, 1080],
    [2560, 1440],
];

// A week: long enough for a bad verdict to be worth a second chance, short enough to notice a new machine
const RETRY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const results = new Map<string, CodecPerformance>();
const retryDecisions = new Map<string, boolean>();
function key(direction: CodecDirection, codec: ProbedCodec, sizeIndex: number): string {
    return `${direction}:${codec}:${sizeIndex}`;
}

/**
 * Asks the browser about every codec at every size, once. A few milliseconds, no encoding involved.
 */
export async function probeCodecPerformance(
    mediaCapabilities: MediaCapabilities | undefined = globalThis.navigator?.mediaCapabilities,
): Promise<void> {
    if (!mediaCapabilities?.encodingInfo || !mediaCapabilities.decodingInfo) {
        return;
    }
    const probes: Promise<void>[] = [];
    for (const codec of PROBED_CODECS) {
        PROBED_SIZES.forEach(([width, height], sizeIndex) => {
            const video: VideoConfiguration = {
                contentType: CONTENT_TYPES[codec],
                width,
                height,
                // Chromium keys its history on the frame size and rate, not on the bitrate
                bitrate: 1_000_000,
                framerate: 30,
            };
            const store = (direction: CodecDirection, info: Promise<MediaCapabilitiesInfo>) =>
                info
                    .then(({ supported, smooth, powerEfficient }) => {
                        results.set(key(direction, codec, sizeIndex), { supported, smooth, powerEfficient });
                    })
                    // A browser that rejects the configuration leaves the codec unknown
                    .catch(() => undefined);
            probes.push(
                store("encode", mediaCapabilities.encodingInfo({ type: "webrtc", video })),
                store("decode", mediaCapabilities.decodingInfo({ type: "webrtc", video })),
            );
        });
    }
    await Promise.all(probes);
}

/**
 * The verdict for a codec at the size we are about to encode or decode, from the closest probed size below it
 * (720p for anything smaller).
 * Unknown until the probe answered, on browsers without the API, and for VP8, which we never probe.
 */
export function codecPerformance(
    direction: CodecDirection,
    codec: VideoCodec,
    pixels: number,
): CodecPerformance | undefined {
    if (codec === "vp8") {
        return undefined;
    }
    let sizeIndex = 0;
    PROBED_SIZES.forEach(([width, height], index) => {
        if (width * height <= pixels) {
            sizeIndex = index;
        }
    });
    return results.get(key(direction, codec, sizeIndex));
}

/**
 * Whether to use a codec the history calls not smooth anyway, once a week.
 *
 * Avoiding a codec means never encoding with it again, so the browser never refreshes its verdict: a single bad
 * session (something heavy running during a call) would demote the codec forever. The retry is decided once per
 * session so every stream of the session agrees.
 */
export function retryGranted(direction: CodecDirection, codec: VideoCodec): boolean {
    const decisionKey = `${direction}:${codec}`;
    const decided = retryDecisions.get(decisionKey);
    if (decided !== undefined) {
        return decided;
    }
    const lastRetry = localUserStore.getCodecRetryTimes()[decisionKey];
    const now = Date.now();
    // A fresh verdict is respected; the clock starts now
    const granted = lastRetry !== undefined && now - lastRetry > RETRY_INTERVAL_MS;
    if (granted || lastRetry === undefined) {
        localUserStore.setCodecRetryTime(decisionKey, now);
    }
    retryDecisions.set(decisionKey, granted);
    return granted;
}

probeCodecPerformance().catch((e) => console.error("Codec performance probe failed", e));
