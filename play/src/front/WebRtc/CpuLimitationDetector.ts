import { get, writable } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { demotedCodecStore } from "./CodecPerformance";
import {
    describeEncoder,
    localEncoderStatsStore,
    type EncoderCategory,
    type LocalEncoderStats,
} from "./LocalEncoderStats";
import { videoCodecFromMimeType, type VideoCodec } from "./VideoPresets";

/**
 * Reacts to an encoder that cannot keep up: fewer encoders first, then a cheaper codec.
 *
 * `qualityLimitationReason === "cpu"` is the verdict of libwebrtc's overuse detector: the encoder took longer than a
 * frame interval for several seconds, and the resolution or the frame rate has already been lowered. The machine is
 * never unprotected; we only decide whether that degradation is the right one. For a software encoder, a cheaper
 * codec at full resolution usually is (sharp text on a screen share), at the price of bandwidth.
 *
 * The reason stays set while the adaptation is in force, so sampling it once a second gives, over a window, the
 * share of time the encoder was limited: gaps in a long episode are tolerated, a lone spike is ignored. One action
 * per decision, then a full window before the next:
 *
 * - In P2P with several peers, the machine runs one encoder per peer. The first action is then to raise the
 *   `cpuLimited` flag on our SpaceUser (cpuLimitedStore, synchronised to the space like the camera state): the back
 *   moves the bubble to LiveKit, where we encode once, and keeps it there while we are in it. Viewers lose nothing.
 *   The flag stays up for the session, so the next bubbles start on LiveKit without paying the window again.
 * - Otherwise the codec is demoted for the session (demotedCodecStore): the publishers reconfigure themselves
 *   (LiveKitRoom republishes, RemotePeer renegotiates), and nothing goes back up before the page is reloaded. A
 *   stream restart is the moment the browser's own smooth history (CodecPerformance) gets to have its say again.
 *
 * Firefox reports no limitation reason: it never gets here.
 */

export type CpuLimitationAction = { kind: "flag" } | { kind: "demote"; codec: VideoCodec };

/**
 * Whether this machine could not keep up while encoding for several P2P peers. Session-wide, never lowered:
 * lowering it once on LiveKit, where the load is gone, would bounce the bubble back and forth.
 */
export const cpuLimitedStore = writable(false);

// If more than 70% of the samples are CPU limited for 30 seconds, we act.
export const WINDOW_SAMPLES = 30;
export const LIMITED_SHARE = 0.7;
// Keyframes and rate-control ramp-up look like overload
export const WARMUP_SAMPLES = 10;
const SAMPLE_INTERVAL_MS = 1000;

/**
 * The codec of the whole set, when its encoders agree on one.
 *
 * A demotion picks one codec for every encoder of the category, and P2P peers negotiate separately (a Firefox peer,
 * a peer we already demoted for): a mixed set is nobody's codec to leave. The summary of the aggregate cannot say
 * this, it holds the codec of whichever encoder is the most limited at that instant.
 */
function agreedMimeType(stats: LocalEncoderStats): string | undefined {
    const mimeTypes = new Set(stats.encoders.map((encoder) => encoder.mimeType));
    return mimeTypes.size === 1 ? stats.encoders[0].mimeType : undefined;
}

export class CpuLimitationDetector {
    private samples: boolean[] = [];
    private warmup = WARMUP_SAMPLES;
    private cooldown = 0;
    private lastSampleTime = -Infinity;
    private source: string | undefined;
    private mimeType: string | undefined;

    constructor(private category: EncoderCategory) {}

    /**
     * Feeds one reading of the aggregated stats of the category. What to demote is read from `stats.encoders`, the
     * readings themselves: the summary around them describes whichever encoder is the most limited at that instant,
     * which is fine for a tile and no basis for a decision. Returns the action to take when it is time.
     * `screenShareRunning` holds the camera back: the screen share is the heavy encoder, it goes first, and demoting
     * the camera in the meantime would mark the wrong codec. `flagRaised` says the transport lever was pulled already.
     */
    public sample(
        stats: LocalEncoderStats | undefined,
        { screenShareRunning, flagRaised }: { screenShareRunning: boolean; flagRaised: boolean },
        now: number = Date.now(),
    ): CpuLimitationAction | undefined {
        const mimeType = stats && agreedMimeType(stats);
        if (!stats || stats.source !== this.source || mimeType !== this.mimeType) {
            // A new stream, a transport switch or a codec change (ours, a peer's, or the set ceasing to agree):
            // start over
            this.samples = [];
            this.warmup = WARMUP_SAMPLES;
            this.cooldown = 0;
            this.source = stats?.source;
            this.mimeType = mimeType;
        }
        if (!stats || now - this.lastSampleTime < SAMPLE_INTERVAL_MS) {
            // Several encoders tick separately: one sample a second whatever their number
            return undefined;
        }
        this.lastSampleTime = now;
        if (this.warmup > 0) {
            this.warmup--;
            return undefined;
        }
        this.samples.push(stats.qualityLimitationReason === "cpu");
        if (this.samples.length > WINDOW_SAMPLES) {
            this.samples.shift();
        }
        if (this.cooldown > 0) {
            this.cooldown--;
            return undefined;
        }
        if (this.samples.length < WINDOW_SAMPLES) {
            return undefined;
        }
        if (this.samples.filter(Boolean).length < LIMITED_SHARE * WINDOW_SAMPLES) {
            return undefined;
        }
        // Several encoders in P2P: fewer encoders first, whatever the codec (the transport switch resets the window;
        // if the back cannot switch, the next window falls through to the codec)
        if (stats.source === "P2P" && stats.encoders.length > 1 && !flagRaised) {
            this.cooldown = WINDOW_SAMPLES;
            return { kind: "flag" };
        }
        // undefined when the encoders disagree on the codec: not ours to demote
        const codec = videoCodecFromMimeType(mimeType);
        // Nothing below H.264; and a cheaper codec gains a hardware encoder nothing, while a set that is only
        // partly hardware still has software encoders to relieve
        if (
            codec === undefined ||
            codec === "h264" ||
            codec === "vp8" ||
            stats.encoders.every((encoder) => describeEncoder(encoder.encoderImplementation).type === "hardware")
        ) {
            return undefined;
        }
        if (this.category === "video" && screenShareRunning) {
            return undefined;
        }
        this.cooldown = WINDOW_SAMPLES;
        return { kind: "demote", codec };
    }
}

/**
 * One detector per category, fed by the stats of the local feedback tiles. Subscribing is what keeps their
 * getStats() poll running: one call per encoder per second.
 */
export function startCpuLimitationDetectors(): void {
    let screenShareStats: LocalEncoderStats | undefined;
    for (const category of ["video", "screenSharing"] as const) {
        const detector = new CpuLimitationDetector(category);
        // Module singletons: never unsubscribed
        // eslint-disable-next-line svelte/no-ignored-unsubscribe
        localEncoderStatsStore[category].subscribe((stats) => {
            if (category === "screenSharing") {
                screenShareStats = stats;
            }
            const action = detector.sample(stats, {
                screenShareRunning: screenShareStats !== undefined,
                flagRaised: get(cpuLimitedStore),
            });
            if (!action) {
                return;
            }
            if (action.kind === "flag") {
                console.info(
                    `The ${category} encoders were CPU-limited for most of the last 30 seconds: asking for LiveKit`,
                );
                cpuLimitedStore.set(true);
                analyticsClient.trackAdminEvent("media.livekit_switch.requested", {
                    streamCategory: category,
                });
            } else {
                console.info(
                    `The ${category} encoder was CPU-limited for most of the last 30 seconds: leaving ${action.codec}`,
                );
                demotedCodecStore[category].set(action.codec);
                analyticsClient.trackAdminEvent("media.codec.degraded", {
                    streamCategory: category,
                    codec: action.codec,
                    // The category's own transport: "Livekit" is the front's name for the SFU
                    transportType: stats?.source === "Livekit" ? "SFU" : "P2P",
                });
            }
        });
    }
}
