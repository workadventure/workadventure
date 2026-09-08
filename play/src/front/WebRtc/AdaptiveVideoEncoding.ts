/**
 * Decides how a P2P video sender encodes for one viewer, from what that viewer displays.
 * Pure logic, kept out of RemotePeer so it can be unit tested.
 */

export type ViewerDisplay = {
    // Size of the tile the viewer renders us in. 0x0 means the tile is not displayed (hidden tab, scrolled out...).
    width: number;
    height: number;
    // Bandwidth the viewer is willing to receive, 0 for no limit.
    maxBitrate: number;
};

export type CaptureSize = { width: number; height: number };

export type VideoPreset = { bitrate: number; fps: number };

export type VideoEncodingUpdate = {
    active: boolean;
    maxBitrate?: number;
    maxFramerate?: number;
    scaleResolutionDownBy?: number;
};

/**
 * What we assume until the viewer tells us the size of its tile: a small stream, so the first frames show up
 * right away at a negligible cost. A viewer that displays the video reports its real size within a second; one
 * that never reports (hidden tab, offscreen tile) gets cut after VIEWER_REPORT_TIMEOUT_MS.
 */
export const DEFAULT_VIEWER_DISPLAY: ViewerDisplay = { width: 320, height: 180, maxBitrate: 0 };
export const HIDDEN_VIEWER_DISPLAY: ViewerDisplay = { width: 0, height: 0, maxBitrate: 0 };
export const VIEWER_REPORT_TIMEOUT_MS = 5000;

export function isViewerDisplayHidden(viewer: ViewerDisplay): boolean {
    return viewer.width <= 0 || viewer.height <= 0;
}

export function computeVideoEncoding(
    viewer: ViewerDisplay,
    capture: CaptureSize,
    selectPreset: (width: number, height: number) => VideoPreset,
): VideoEncodingUpdate {
    if (isViewerDisplayHidden(viewer)) {
        // Nobody looks at it: stop the encoder for this connection (audio is not affected).
        return { active: false };
    }

    // Never encode more than what is displayed or what the camera captures.
    let { width, height } = viewer;
    if (capture.width * capture.height < width * height) {
        width = capture.width;
        height = capture.height;
    }

    const preset = selectPreset(width, height);
    const scaleFactor = Math.max(1, Math.min(capture.width / width, capture.height / height));

    return {
        active: true,
        maxBitrate: viewer.maxBitrate > 0 ? Math.min(preset.bitrate, viewer.maxBitrate) : preset.bitrate,
        maxFramerate: preset.fps,
        scaleResolutionDownBy: scaleFactor > 1 ? scaleFactor : undefined,
    };
}
