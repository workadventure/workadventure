export interface WebRtcStats {
    source: string;
    frameWidth: number;
    frameHeight: number;
    jitter: number;
    mimeType?: string;
    // Bandwidth in bytes/seconds
    bandwidth: number;
    fps: number;
}
