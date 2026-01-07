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
    return readable<WebRtcStats | undefined>(undefined, (set) => {
        let bytesReceivedPrev = 0;
        let framesDecodedPrev = 0;
        let timestampPrev = Date.now();
        const interval = setInterval(() => {
            if (remotePeer.destroyed) {
                set(undefined);
                clearInterval(interval);
                return;
            }
            const pc = remotePeer._pc as RTCPeerConnection;
            if (pc) {
                pc.getStats(null)
                    .then((stats) => {
                        const videoTrackId = remotePeer.remoteStream?.getVideoTracks()[0]?.id;
                        let receiverStats: WebRtcStats | undefined;
                        let codecID = "";
                        /* eslint-disable @typescript-eslint/no-explicit-any */
                        const codecs = new Map<string, any>();
                        // ICE statistics containers
                        const transports = new Map<string, any>();
                        const candidatePairs = new Map<string, any>();
                        const localCandidates = new Map<string, any>();
                        const remoteCandidates = new Map<string, any>();
                        let bytesReceived = 0;
                        let framesDecoded = 0;
                        let timestamp = 0;
                        stats.forEach((v) => {
                            if (v.type === "inbound-rtp" && v.trackIdentifier === videoTrackId) {
                                codecID = v.codecId;
                                // Calculate bandwidth in bytes per second
                                const bandwidth =
                                    (v.bytesReceived - bytesReceivedPrev) / ((v.timestamp - timestampPrev) / 1000);
                                const fps =
                                    (v.framesDecoded - framesDecodedPrev) / ((v.timestamp - timestampPrev) / 1000);
                                receiverStats = {
                                    frameWidth: v.frameWidth,
                                    frameHeight: v.frameHeight,
                                    /* nackCount: v.nackCount,*/
                                    jitter: v.jitter,
                                    bandwidth: bandwidth,
                                    fps: fps,
                                    source: "P2P",
                                };
                                bytesReceived = v.bytesReceived;
                                framesDecoded = v.framesDecoded;
                                timestamp = v.timestamp;
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
                            // Prefer transport.selectedCandidatePairId if available
                            for (const t of transports.values()) {
                                if (t.selectedCandidatePairId && candidatePairs.has(t.selectedCandidatePairId)) {
                                    selectedPair = candidatePairs.get(t.selectedCandidatePairId);
                                    break;
                                }
                            }
                            // Fallback: find nominated/selected candidate-pair in succeeded state
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
                                const isRelay =
                                    (local && local.candidateType === "relay") ||
                                    (remote && remote.candidateType === "relay");
                                let proto: string | undefined =
                                    (local && (local.relayProtocol || local.protocol)) ||
                                    (remote && remote.protocol) ||
                                    undefined;
                                proto = proto?.toLowerCase();
                                receiverStats.relay = !!isRelay;
                                if (proto === "udp" || proto === "tcp" || proto === "tls") {
                                    receiverStats.relayProtocol = proto;
                                    if (proto === "tcp") {
                                        receiverStats.source = "P2P (via TURN/TCP)";
                                    } else if (proto === "tls") {
                                        receiverStats.source = "P2P (via TURN/TLS)";
                                    } else {
                                        receiverStats.source = "P2P (via TURN/UDP)";
                                    }
                                }
                            }
                        }
                        if (receiverStats && codecID !== "" && codecs.get(codecID)) {
                            receiverStats.mimeType = codecs.get(codecID).mimeType;
                        }
                        bytesReceivedPrev = bytesReceived;
                        framesDecodedPrev = framesDecoded;
                        timestampPrev = timestamp;

                        set(receiverStats);
                    })
                    .catch((e) => {
                        console.error("getStats error for peer ", remotePeer.spaceUserId, e);
                    });
            }
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    });
}
