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
    // The sender intentionally sends no video right now
    paused?: boolean;
    // Whether the selected ICE route is TURN relayed
    relay?: boolean;
    // Protocol used with TURN when relayed (browser-dependent)
    relayProtocol?: "udp" | "tcp" | "tls";
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
    // Why the browser is not encoding at the requested quality ("cpu" = the machine cannot keep up)
    qualityLimitationReason: WebRtcQualityLimitationReason;
    // Encoder reported by the browser, e.g. "libaom" / "libvpx" (software) or "ExternalEncoder" (hardware)
    encoderImplementation?: string;
}
