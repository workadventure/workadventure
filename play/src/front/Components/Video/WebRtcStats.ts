export interface WebRtcStats {
    source: string;
    frameWidth: number;
    frameHeight: number;
    jitter: number;
    mimeType?: string;
    // Bandwidth in bytes/seconds
    bandwidth: number;
    fps: number;
    // Variability of the received frame rate, deliberate changes excluded (see FpsVariabilityTracker).
    // Never measured for screen shares, whose frame rate follows the content.
    fpsStdDev?: number;
    // Frame rate the sender targets for us, when it told us (0: it paused the video because we do not display it)
    expectedFps?: number;
    // Whether the selected ICE route is TURN relayed
    relay?: boolean;
    // Protocol used with TURN when relayed (browser-dependent)
    relayProtocol?: "udp" | "tcp" | "tls";
    // Cumulative playback counters of the inbound RTP stream: the analytics report their difference between samples
    playback?: VideoPlaybackCounters;
    // Round-trip time of the connection the stream arrives on (selected ICE candidate pair), in milliseconds: to the
    // peer (or the TURN relay) in P2P, to the SFU with LiveKit
    roundTripTimeMs?: number;
}

/**
 * Cumulative counters of an RTCInboundRtpStreamStats, as the browser reports them. A counter the browser does not
 * expose is undefined (not 0), so that "not measured" never reads as "no freeze".
 */
export interface VideoPlaybackCounters {
    // The stats object the counters belong to: a new one (renegotiation) restarts every counter from 0
    statsId: string;
    // RTCStats.timestamp, in milliseconds
    timestampMs: number;
    framesDecoded: number;
    framesDropped?: number;
    // Gaps between two rendered frames longer than max(3 x the average frame duration, average + 150 ms), up to 5 s
    freezeCount?: number;
    totalFreezesDuration?: number;
    // Gaps longer than 5 s (never counted as freezes)
    pauseCount?: number;
    totalPausesDuration?: number;
    totalInterFrameDelay?: number;
    totalSquaredInterFrameDelay?: number;
    totalDecodeTime?: number;
    packetsReceived?: number;
    // Can go down when a packet counted as lost arrives late: never a reason to restart the window
    packetsLost?: number;
}

// RTCOutboundRtpStreamStats.qualityLimitationReason
export type WebRtcQualityLimitationReason = "none" | "cpu" | "bandwidth" | "other";

/**
 * Statistics of a video track we are sending (camera or screen share), read from the encoder side of the connection.
 */
export interface WebRtcSenderStats {
    source: string;
    frameWidth: number;
    frameHeight: number;
    mimeType?: string;
    // Bytes sent per second, all simulcast/SVC layers included
    bandwidth: number;
    // Frames encoded per second on the largest layer
    fps: number;
    // Layers configured to be sent: LiveKit's dynacast and a hidden P2P tile switch the others off.
    // Undefined when the browser does not report it.
    activeLayers?: number;
    // Frames encoded per second on the busiest active layer. 0 with active layers: the source delivers nothing.
    activeFps?: number;
    // Why the browser is not encoding at the requested quality ("cpu" = the machine cannot keep up)
    qualityLimitationReason: WebRtcQualityLimitationReason;
    // Encoder reported by the browser, e.g. "libaom" / "libvpx" (software) or "ExternalEncoder" (hardware)
    encoderImplementation?: string;
    // Frames per second the capture actually delivered (RTCVideoSourceStats), and the rate the camera / screen capture
    // is configured at (MediaTrackSettings.frameRate): a camera below its configured rate starves the encoder.
    captureFps?: number;
    captureTargetFps?: number;
    // Size the capture delivers (MediaTrackSettings.width / height), where frameWidth / frameHeight is what is sent
    captureWidth?: number;
    captureHeight?: number;
    // Encoding time per encoded frame, all layers, in milliseconds
    encodeMsPerFrame?: number;
    // Share of the time (0 to 1) the encoder degraded the stream for lack of CPU / of bandwidth
    // (RTCOutboundRtpStreamStats.qualityLimitationDurations), where qualityLimitationReason is only a snapshot
    cpuLimitedRatio?: number;
    bandwidthLimitedRatio?: number;
    // From the receiver reports of the other end (RTCRemoteInboundRtpStreamStats) of the largest layer: round-trip
    // time in milliseconds, and the share of the packets lost on the way (0 to 1)
    uploadRoundTripTimeMs?: number;
    uploadLossRatio?: number;
    // The browser's estimate of the bandwidth available to send (selected candidate pair), in bits per second
    availableOutgoingBitrate?: number;
}
