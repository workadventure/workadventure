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
export const VIEWER_REPORT_TIMEOUT_MS = 5000;

export function isViewerDisplayHidden(viewer: ViewerDisplay): boolean {
    return viewer.width <= 0 || viewer.height <= 0;
}

export function computeVideoEncoding(
    viewer: ViewerDisplay,
    capture: { width: number; height: number },
    selectPreset: (width: number, height: number) => { bitrate: number; fps: number },
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
        scaleResolutionDownBy: scaleFactor > 1 ? evenScaleFactor(capture, scaleFactor) : undefined,
    };
}

const floorEven = (value: number) => Math.floor(value / 2) * 2;
// The dimension truncates (Firefox) and rounds (Chrome) to the same even integer. No epsilon on purpose: the
// browser divides the same doubles, so a ratio that lands a hair below an even integer here does there too.
const landsEven = (value: number) => Math.floor(value) % 2 === 0 && value % 1 < 0.5;

/**
 * WORKAROUND for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=2073405 (regression in Firefox 154):
 * the built-in VP9 encoder stops producing frames as soon as a scaled frame has an odd width or height, and a
 * viewer's tile is an arbitrary size, so nearly every scale lands on an odd frame. Once the bug is fixed in every
 * Firefox version we care about, delete this function and pass the plain scale factor again (and drop the
 * "maintain-resolution" degradation preference set for Firefox in RemotePeer.applyVideoEncoding).
 *
 * The smallest scale at or above `minScale` whose scaled width and height are both even. Scanning the even heights
 * downwards, the scale must lie within the window where the height truncates to that even height and within the
 * window where the width truncates to an even width; the first pair of windows that overlap wins. Both dimensions
 * also round to the same even integers, so the result holds whether the browser truncates (Firefox) or rounds
 * (Chrome).
 */
export function evenScaleFactor(capture: { width: number; height: number }, minScale: number): number {
    if (landsEven(capture.width / minScale) && landsEven(capture.height / minScale)) {
        return minScale;
    }
    for (let height = floorEven(capture.height / minScale); height >= 2; height -= 2) {
        // Widths reachable while the height still truncates to `height`
        const widthMin = (capture.width * height) / capture.height;
        const widthMax = (capture.width * (height + 0.5)) / capture.height;
        for (let width = floorEven(widthMax); width > widthMin - 0.5 && width >= 2; width -= 2) {
            const low = Math.max(minScale, capture.width / (width + 0.5), capture.height / (height + 0.5));
            const high = Math.min(capture.width / width, capture.height / height);
            if (low < high) {
                return (low + high) / 2;
            }
        }
    }
    return minScale;
}
