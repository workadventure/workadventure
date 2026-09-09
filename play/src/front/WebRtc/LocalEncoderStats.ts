import { derived, writable, type Readable, type Unsubscriber } from "svelte/store";
import type { WebRtcQualityLimitationReason, WebRtcSenderStats } from "../Components/Video/WebRtcStats";

/**
 * Health of the encoders of what we send, as displayed in the local camera / screen share feedback tiles.
 *
 * Every active sender registers its stats store here: one per LiveKit published track, one per P2P connection
 * (Chrome runs one encoder per RTCPeerConnection). The tiles display one aggregate per category, the worst case.
 */

export type EncoderCategory = "video" | "screenSharing";

export interface LocalEncoderStats extends WebRtcSenderStats {
    // Number of encoders aggregated (P2P: one per peer)
    encoderCount: number;
}

export type EncoderType = "software" | "hardware" | "unknown";

const SOFTWARE_ENCODERS = /libaom|libvpx|openh264|libx264|svt/i;
const HARDWARE_ENCODERS = /external|hardware|videotoolbox|mediafoundation|vaapi|nvenc|qsv|v4l2|mediacodec/i;

/**
 * Chrome names software encoders after their library ("libaom", "libvpx", "OpenH264", possibly wrapped in
 * "SimulcastEncoderAdapter (libvpx, libvpx)") and hardware ones "ExternalEncoder". Firefox reports nothing.
 */
export function describeEncoder(encoderImplementation: string | undefined): { name: string; type: EncoderType } {
    if (!encoderImplementation) {
        return { name: "-", type: "unknown" };
    }
    if (SOFTWARE_ENCODERS.test(encoderImplementation)) {
        return { name: encoderImplementation, type: "software" };
    }
    if (HARDWARE_ENCODERS.test(encoderImplementation)) {
        return { name: encoderImplementation, type: "hardware" };
    }
    return { name: encoderImplementation, type: "unknown" };
}

const REASON_SEVERITY: Record<WebRtcQualityLimitationReason, number> = {
    none: 0,
    other: 1,
    bandwidth: 2,
    cpu: 3,
};

/**
 * Worst case over several encoders: the most severe limitation reason wins, bandwidth is summed (that is what
 * leaves the machine), fps is the lowest, the resolution the largest.
 */
export function aggregateSenderStats(values: (WebRtcSenderStats | undefined)[]): LocalEncoderStats | undefined {
    const stats = values.filter((value): value is WebRtcSenderStats => value !== undefined);
    if (stats.length === 0) {
        return undefined;
    }
    const worst = stats.reduce((a, b) =>
        REASON_SEVERITY[b.qualityLimitationReason] > REASON_SEVERITY[a.qualityLimitationReason] ? b : a,
    );
    const largest = stats.reduce((a, b) => (b.frameWidth * b.frameHeight > a.frameWidth * a.frameHeight ? b : a));
    return {
        source: stats.length > 1 ? `${stats[0].source} (${stats.length} encoders)` : stats[0].source,
        frameWidth: largest.frameWidth,
        frameHeight: largest.frameHeight,
        mimeType: worst.mimeType ?? stats.find((s) => s.mimeType !== undefined)?.mimeType,
        bandwidth: stats.reduce((sum, s) => sum + s.bandwidth, 0),
        fps: Math.min(...stats.map((s) => s.fps)),
        qualityLimitationReason: worst.qualityLimitationReason,
        encoderImplementation:
            worst.encoderImplementation ??
            stats.find((s) => s.encoderImplementation !== undefined)?.encoderImplementation,
        encoderCount: stats.length,
    };
}

class LocalEncoderStatsRegistry {
    private readonly stores = writable(new Map<symbol, Readable<WebRtcSenderStats | undefined>>());

    public readonly stats: Readable<LocalEncoderStats | undefined> = derived<
        Readable<Map<symbol, Readable<WebRtcSenderStats | undefined>>>,
        LocalEncoderStats | undefined
    >(
        this.stores,
        ($stores, set) => {
            const list = Array.from($stores.values());
            if (list.length === 0) {
                set(undefined);
                return;
            }
            return derived(list, ($values) => aggregateSenderStats($values)).subscribe(set);
        },
        undefined,
    );

    public register(store: Readable<WebRtcSenderStats | undefined>): Unsubscriber {
        const key = Symbol();
        this.stores.update((stores) => new Map(stores).set(key, store));
        return () => {
            this.stores.update((stores) => {
                const next = new Map(stores);
                next.delete(key);
                return next;
            });
        };
    }
}

const registries: Record<EncoderCategory, LocalEncoderStatsRegistry> = {
    video: new LocalEncoderStatsRegistry(),
    screenSharing: new LocalEncoderStatsRegistry(),
};

/**
 * Registers the stats store of an encoder we run. Returns the function removing it.
 */
export function registerLocalEncoderStats(
    category: EncoderCategory,
    store: Readable<WebRtcSenderStats | undefined>,
): Unsubscriber {
    return registries[category].register(store);
}

export const localEncoderStatsStore: Record<EncoderCategory, Readable<LocalEncoderStats | undefined>> = {
    video: registries.video.stats,
    screenSharing: registries.screenSharing.stats,
};
