import type { RemoteTrack } from "livekit-client";
import { readable, type Readable } from "svelte/store";
import type { WebRtcStats } from "../Components/Video/WebRtcStats";
import type { RemotePeer } from "./RemotePeer";

/**
 * Creates a readable store that provides WebRTC statistics for a peer connection.
 * Updates every second with current bandwidth, FPS, frame dimensions, jitter, and TURN routing info.
 *
 * @param remotePeer The RemotePeer instance to collect statistics from
 * @returns A Svelte readable store with WebRtcStats or undefined
 */
export function createWebRtcStats(remotePeer: RemotePeer): Readable<WebRtcStats | undefined> {
    return createWebRtcStatsFromReport(
        () => {
            const pc = remotePeer._pc as RTCPeerConnection;
            if (!pc) {
                return Promise.resolve(undefined);
            }
            return pc.getStats(null);
        },
        {
            source: "P2P",
            getTrackId: () => remotePeer.remoteStream?.getVideoTracks()[0]?.id,
            includeRelayDetails: true,
            isStopped: () => remotePeer.destroyed,
            onError: (e) => console.error("getStats error for peer ", remotePeer.spaceUserId, e),
        }
    );
}

export function createLivekitWebRtcStats(track: RemoteTrack | undefined): Readable<WebRtcStats | undefined> {
    return createWebRtcStatsFromReport(
        () => {
            if (!track) {
                return Promise.resolve(undefined);
            }
            return track.getRTCStatsReport();
        },
        {
            source: "Livekit",
            getTrackId: () => {
                if (!track) {
                    return undefined;
                }
                const trackWithMedia = track as unknown as { mediaStreamTrack?: MediaStreamTrack };
                return trackWithMedia.mediaStreamTrack?.id;
            },
            includeRelayDetails: false,
            onError: (e) => console.error("getRTCStatsReport error for livekit track", e),
        }
    );
}

type StatsFactoryOptions = {
    source: string;
    getTrackId?: () => string | undefined;
    includeRelayDetails?: boolean;
    isStopped?: () => boolean;
    onError?: (error: unknown) => void;
};

function createWebRtcStatsFromReport(
    getReport: () => Promise<RTCStatsReport | undefined>,
    options: StatsFactoryOptions
): Readable<WebRtcStats | undefined> {
    return readable<WebRtcStats | undefined>(undefined, (set) => {
        let bytesReceivedPrev = 0;
        let framesDecodedPrev = 0;
        let timestampPrev = 0;
        const interval = setInterval(() => {
            if (options.isStopped?.()) {
                set(undefined);
                clearInterval(interval);
                return;
            }
            getReport()
                .then((stats) => {
                    if (!stats) {
                        return;
                    }
                    const videoTrackId = options.getTrackId?.();
                    const { receiverStats, bytesReceived, framesDecoded, timestamp } = buildWebRtcStatsFromReport(
                        stats,
                        videoTrackId,
                        {
                            bytesReceivedPrev,
                            framesDecodedPrev,
                            timestampPrev,
                        },
                        options
                    );
                    if (timestamp) {
                        bytesReceivedPrev = bytesReceived;
                        framesDecodedPrev = framesDecoded;
                        timestampPrev = timestamp;
                    }
                    if (receiverStats) {
                        set(receiverStats);
                    }
                })
                .catch((e) => {
                    options.onError?.(e);
                });
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    });
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
    options: StatsFactoryOptions
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
