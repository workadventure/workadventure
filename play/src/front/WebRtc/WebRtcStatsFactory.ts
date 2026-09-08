import { Track, type LocalVideoTrack, type RemoteTrack } from "livekit-client";
import { derived, readable, type Readable } from "svelte/store";
import type { WebRtcQualityLimitationReason, WebRtcSenderStats, WebRtcStats } from "../Components/Video/WebRtcStats";
import type { RemotePeer } from "./RemotePeer";
import { FpsVariabilityTracker } from "./FpsVariabilityTracker";

const WEBRTC_STATS_DISPLAY_INTERVAL_MS = 1_000;

export type PeerWebRtcStats = {
    // What we receive from the peer
    receiver: Readable<WebRtcStats | undefined>;
    // What we send to the peer (our own encoder)
    sender: Readable<WebRtcSenderStats | undefined>;
};

/**
 * Creates the WebRTC statistics stores of a P2P connection. Both stores are derived from a single getStats()
 * poll (one call per second while at least one of them is subscribed).
 */
export function createPeerWebRtcStats(remotePeer: RemotePeer): PeerWebRtcStats {
    const reportStore = createStatsReportStore(
        () => {
            const pc = remotePeer._pc as RTCPeerConnection;
            if (!pc) {
                return Promise.resolve(undefined);
            }
            return pc.getStats(null);
        },
        {
            isStopped: () => remotePeer.destroyed,
            onError: (e) => console.error("getStats error for peer ", remotePeer.spaceUserId, e),
        },
    );
    return {
        receiver: createReceiverStatsStore(reportStore, {
            source: "P2P",
            getTrackId: () => remotePeer.remoteStream?.getVideoTracks()[0]?.id,
            includeRelayDetails: true,
            getExpectedFps: () => remotePeer.expectedFps,
            measureFpsVariability: remotePeer.videoType === "video",
        }),
        sender: createSenderStatsStore(reportStore, "P2P"),
    };
}

export function createLivekitWebRtcStats(
    track: RemoteTrack | undefined,
    videoType: "video" | "screenSharing",
): Readable<WebRtcStats | undefined> {
    const reportStore = createStatsReportStore(
        () => {
            if (!track) {
                return Promise.resolve(undefined);
            }
            return track.getRTCStatsReport();
        },
        {
            onError: (e) => console.error("getRTCStatsReport error for livekit track", e),
        },
    );
    return createReceiverStatsStore(reportStore, {
        source: "Livekit",
        getTrackId: () => {
            if (!track) {
                return undefined;
            }
            const trackWithMedia = track as unknown as { mediaStreamTrack?: MediaStreamTrack };
            return trackWithMedia.mediaStreamTrack?.id;
        },
        includeRelayDetails: false,
        // The SFU pauses the track when we do not display it (adaptiveStream); the target frame rate is unknown
        getExpectedFps: () => (track?.streamState === Track.StreamState.Paused ? 0 : undefined),
        measureFpsVariability: videoType === "video",
    });
}

/**
 * Statistics of a track we publish to LiveKit (the report only contains this track's sender).
 */
export function createLivekitSenderStats(track: LocalVideoTrack): Readable<WebRtcSenderStats | undefined> {
    const reportStore = createStatsReportStore(() => track.getRTCStatsReport(), {
        onError: (e) => console.error("getRTCStatsReport error for local livekit track", e),
    });
    return createSenderStatsStore(reportStore, "Livekit");
}

type StatsReportStoreOptions = {
    isStopped?: () => boolean;
    onError?: (error: unknown) => void;
    intervalMs?: number;
};

function createStatsReportStore(
    getReport: () => Promise<RTCStatsReport | undefined>,
    options: StatsReportStoreOptions,
): Readable<RTCStatsReport | undefined> {
    return readable<RTCStatsReport | undefined>(undefined, (set) => {
        const interval = setInterval(() => {
            if (options.isStopped?.()) {
                set(undefined);
                clearInterval(interval);
                return;
            }
            getReport()
                .then((report) => {
                    if (report) {
                        set(report);
                    }
                })
                .catch((e) => {
                    options.onError?.(e);
                });
        }, options.intervalMs ?? WEBRTC_STATS_DISPLAY_INTERVAL_MS);
        return () => {
            clearInterval(interval);
        };
    });
}

type ReceiverStatsOptions = {
    source: string;
    getTrackId?: () => string | undefined;
    includeRelayDetails?: boolean;
    // Frame rate the sender targets for us right now, 0 when it intentionally sends nothing, undefined if unknown
    getExpectedFps?: () => number | undefined;
    // False for screen shares: their frame rate follows the content (a still screen sends about one frame per
    // second, whatever the codec), so its variability says nothing about the connection.
    measureFpsVariability: boolean;
};

function createReceiverStatsStore(
    reportStore: Readable<RTCStatsReport | undefined>,
    options: ReceiverStatsOptions,
): Readable<WebRtcStats | undefined> {
    let bytesReceivedPrev = 0;
    let framesDecodedPrev = 0;
    let timestampPrev = 0;
    const fpsVariability = new FpsVariabilityTracker();

    return derived<Readable<RTCStatsReport | undefined>, WebRtcStats | undefined>(
        reportStore,
        ($report, set) => {
            if (!$report) {
                set(undefined);
                return;
            }
            const videoTrackId = options.getTrackId?.();
            const { receiverStats, bytesReceived, framesDecoded, timestamp } = buildWebRtcStatsFromReport(
                $report,
                videoTrackId,
                {
                    bytesReceivedPrev,
                    framesDecodedPrev,
                    timestampPrev,
                },
                options,
            );
            if (timestamp) {
                bytesReceivedPrev = bytesReceived;
                framesDecodedPrev = framesDecoded;
                timestampPrev = timestamp;
            }
            if (!receiverStats) {
                return;
            }
            const expectedFps = options.getExpectedFps?.();
            receiverStats.expectedFps = expectedFps;
            receiverStats.paused = expectedFps === 0;
            receiverStats.fpsStdDev = options.measureFpsVariability
                ? fpsVariability.push(
                      receiverStats.fps,
                      expectedFps,
                      receiverStats.frameWidth,
                      receiverStats.frameHeight,
                      Date.now(),
                  )
                : undefined;
            set(receiverStats);
        },
        undefined,
    );
}

function createSenderStatsStore(
    reportStore: Readable<RTCStatsReport | undefined>,
    source: string,
): Readable<WebRtcSenderStats | undefined> {
    const prev = new Map<string, SenderLayerPrev>();

    return derived<Readable<RTCStatsReport | undefined>, WebRtcSenderStats | undefined>(
        reportStore,
        ($report, set) => {
            if (!$report) {
                set(undefined);
                return;
            }
            set(buildWebRtcSenderStatsFromReport($report, prev, source));
        },
        undefined,
    );
}

type StatsPrev = {
    bytesReceivedPrev: number;
    framesDecodedPrev: number;
    timestampPrev: number;
};

function buildWebRtcStatsFromReport(
    stats: RTCStatsReport,
    videoTrackId: string | undefined,
    prev: StatsPrev,
    options: ReceiverStatsOptions,
): {
    receiverStats: WebRtcStats | undefined;
    bytesReceived: number;
    framesDecoded: number;
    timestamp: number;
} {
    let receiverStats: WebRtcStats | undefined;
    let codecID = "";
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const codecs = new Map<string, any>();
    const transports = new Map<string, any>();
    const candidatePairs = new Map<string, any>();
    const localCandidates = new Map<string, any>();
    const remoteCandidates = new Map<string, any>();
    let bytesReceived = 0;
    let framesDecoded = 0;
    let timestamp = 0;
    stats.forEach((v: any) => {
        const isInboundRtp = v.type === "inbound-rtp";
        const isVideo = v.kind === "video" || v.mediaType === "video";
        const matchesTrack = !videoTrackId || v.trackIdentifier === videoTrackId;
        const matchesMedia = isVideo || !videoTrackId;
        if (isInboundRtp && matchesTrack && matchesMedia) {
            codecID = v.codecId;
            const timeDiffSeconds = prev.timestampPrev > 0 ? (v.timestamp - prev.timestampPrev) / 1000 : 0;
            const bandwidth =
                timeDiffSeconds > 0 && v.bytesReceived !== undefined
                    ? (v.bytesReceived - prev.bytesReceivedPrev) / timeDiffSeconds
                    : 0;
            const fps =
                timeDiffSeconds > 0 && v.framesDecoded !== undefined
                    ? (v.framesDecoded - prev.framesDecodedPrev) / timeDiffSeconds
                    : 0;
            receiverStats = {
                frameWidth: v.frameWidth ?? 0,
                frameHeight: v.frameHeight ?? 0,
                jitter: v.jitter ?? 0,
                bandwidth: bandwidth,
                fps: fps,
                source: options.source,
            };
            bytesReceived = v.bytesReceived ?? 0;
            framesDecoded = v.framesDecoded ?? 0;
            timestamp = v.timestamp ?? 0;
        } else if (v.type === "codec") {
            codecs.set(v.id, v);
        } else if (v.type === "transport") {
            transports.set(v.id, v);
        } else if (v.type === "candidate-pair") {
            candidatePairs.set(v.id, v);
        } else if (v.type === "local-candidate") {
            localCandidates.set(v.id, v);
        } else if (v.type === "remote-candidate") {
            remoteCandidates.set(v.id, v);
        }
    });
    // Enrich receiverStats with TURN routing information when possible
    if (receiverStats) {
        let selectedPair: any | undefined;
        for (const t of transports.values()) {
            if (t.selectedCandidatePairId && candidatePairs.has(t.selectedCandidatePairId)) {
                selectedPair = candidatePairs.get(t.selectedCandidatePairId);
                break;
            }
        }
        if (!selectedPair) {
            for (const p of candidatePairs.values()) {
                if (p.selected === true || (p.nominated === true && p.state === "succeeded")) {
                    selectedPair = p;
                    break;
                }
            }
        }
        if (selectedPair) {
            const local = localCandidates.get(selectedPair.localCandidateId);
            const remote = remoteCandidates.get(selectedPair.remoteCandidateId);
            const isRelay = (local && local.candidateType === "relay") || (remote && remote.candidateType === "relay");
            let proto: string | undefined =
                (local && (local.relayProtocol || local.protocol)) || (remote && remote.protocol) || undefined;
            proto = proto?.toLowerCase();
            receiverStats.relay = !!isRelay;
            if (proto === "udp" || proto === "tcp" || proto === "tls") {
                receiverStats.relayProtocol = proto;
                if (receiverStats.relay && options.includeRelayDetails) {
                    if (proto === "tcp") {
                        receiverStats.source = `${options.source} (via TURN/TCP)`;
                    } else if (proto === "tls") {
                        receiverStats.source = `${options.source} (via TURN/TLS)`;
                    } else {
                        receiverStats.source = `${options.source} (via TURN/UDP)`;
                    }
                }
            }
        }
    }
    if (receiverStats && codecID !== "" && codecs.get(codecID)) {
        receiverStats.mimeType = codecs.get(codecID).mimeType;
    }
    return {
        receiverStats,
        bytesReceived,
        framesDecoded,
        timestamp,
    };
}

export type SenderLayerPrev = {
    bytesSent: number;
    framesEncoded: number;
    timestamp: number;
};

/**
 * Builds the sender-side statistics from a stats report containing our outbound video RTP stream(s).
 * With simulcast or SVC there is one outbound-rtp entry per layer: the frame size, fps and limitation reason come
 * from the largest layer, the bandwidth is the sum of all layers.
 *
 * Returns undefined when the report has no outbound video stream or when no previous sample allows computing rates.
 * `prev` is updated in place with the counters of this report.
 */
export function buildWebRtcSenderStatsFromReport(
    stats: RTCStatsReport,
    prev: Map<string, SenderLayerPrev>,
    source: string,
): WebRtcSenderStats | undefined {
    const layers: any[] = [];
    const codecs = new Map<string, any>();
    stats.forEach((v: any) => {
        if (v.type === "outbound-rtp" && (v.kind === "video" || v.mediaType === "video")) {
            layers.push(v);
        } else if (v.type === "codec") {
            codecs.set(v.id, v);
        }
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (layers.length === 0) {
        prev.clear();
        return undefined;
    }

    const topLayer = layers.reduce((best, layer) =>
        (layer.frameWidth ?? 0) * (layer.frameHeight ?? 0) > (best.frameWidth ?? 0) * (best.frameHeight ?? 0)
            ? layer
            : best,
    );
    const topPrev = prev.get(topLayer.id);
    const timeDiffSeconds = topPrev ? (topLayer.timestamp - topPrev.timestamp) / 1000 : 0;

    let bytesSentDelta = 0;
    for (const layer of layers) {
        const layerPrev = prev.get(layer.id);
        if (layerPrev) {
            bytesSentDelta += (layer.bytesSent ?? 0) - layerPrev.bytesSent;
        }
        prev.set(layer.id, {
            bytesSent: layer.bytesSent ?? 0,
            framesEncoded: layer.framesEncoded ?? 0,
            timestamp: layer.timestamp ?? 0,
        });
    }
    for (const id of Array.from(prev.keys())) {
        if (!layers.some((layer) => layer.id === id)) {
            prev.delete(id);
        }
    }

    if (!topPrev || timeDiffSeconds <= 0) {
        return undefined;
    }

    return {
        source,
        frameWidth: topLayer.frameWidth ?? 0,
        frameHeight: topLayer.frameHeight ?? 0,
        mimeType: codecs.get(topLayer.codecId)?.mimeType,
        bandwidth: Math.max(0, bytesSentDelta) / timeDiffSeconds,
        fps: Math.max(0, (topLayer.framesEncoded ?? 0) - topPrev.framesEncoded) / timeDiffSeconds,
        qualityLimitationReason: toQualityLimitationReason(topLayer.qualityLimitationReason),
        encoderImplementation:
            typeof topLayer.encoderImplementation === "string" ? topLayer.encoderImplementation : undefined,
    };
}

function toQualityLimitationReason(reason: unknown): WebRtcQualityLimitationReason {
    switch (reason) {
        case "cpu":
        case "bandwidth":
        case "other":
            return reason;
        default:
            return "none";
    }
}
