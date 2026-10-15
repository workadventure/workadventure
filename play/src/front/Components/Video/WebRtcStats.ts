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
}
