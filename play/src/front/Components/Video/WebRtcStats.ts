export interface WebRtcStats {
    source: string;
    frameWidth: number;
    frameHeight: number;
    jitter: number;
    mimeType?: string;
    // Bandwidth in bytes/seconds
    bandwidth: number;
    fps: number;
    // Whether the selected ICE route is TURN relayed
    relay?: boolean;
    // Protocol used with TURN when relayed (browser-dependent)
    relayProtocol?: "udp" | "tcp" | "tls";
}
