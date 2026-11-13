import path from "path";
import type { TrayStatus } from "./presence";

// The tray has its own icon: the logo's cup redrawn for 16 px, with its @2x next to it (Electron loads
// both from the one path). The logo itself is a 26 px wide cup on a navy tile: scaled down to tray size
// the cup is a blur, and the tile is lost on a dark bar.
//
// It is pixel art: edit it at 16 px and export the @2x at exactly twice that, without smoothing. The
// navy keyline around the cup is what keeps it readable on a light bar. The color of the bar cannot be
// asked for (Ubuntu's is dark in light mode too, the macOS one follows the wallpaper), so a single icon
// has to work on both.
export const TRAY_ICON_PATH = path.join(__dirname, "..", "assets", "icons", "tray.png");

/** Side of the tray icon in points. */
export const TRAY_ICON_SIZE = 16;

// Status-dot colors, as 0xRRGGBB. Mirror WA's own availability colors (the `filling` values in
// play/src/front/Utils/AvailabilityStatus.ts getColorHexOfStatus): busy gold, back-in-a-moment blue,
// do-not-disturb coral. Idle reuses WA's AWAY gold; meeting reuses WA's SILENT red as a "busy in a
// meeting" signal. Online is the resting state: the bare cup, no dot.
export const TRAY_DOT_COLOR: Record<TrayStatus, number | undefined> = {
    online: undefined,
    meeting: 0xe74c3c,
    do_not_disturb: 0xe96e53,
    busy: 0xe9c84e,
    back_in_a_moment: 0x7382e2,
    idle: 0xe9c84e,
    offline: 0x6b7280,
};

// The dot fills the bottom-right corner of the 16 px icon: pixels 10 to 15, without its own corners.
const DOT_CENTER = 12.5;
const DOT_RADIUS_SQUARED = 10;
// One more pixel around the dot is cleared, so that it does not touch the cup.
const GAP_RADIUS_SQUARED = 20;

/**
 * Draw the status dot over the cup, in place. `bitmap` holds the BGRA pixels (nativeImage.toBitmap())
 * of the icon at `scale` times TRAY_ICON_SIZE. The dot is pixel art like the cup: it is laid out on the
 * 16 px grid, then scaled by whole pixels.
 */
export function drawStatusDot(bitmap: Buffer, scale: number, color: number): void {
    const size = TRAY_ICON_SIZE * scale;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const distanceSquared =
                (Math.floor(x / scale) - DOT_CENTER) ** 2 + (Math.floor(y / scale) - DOT_CENTER) ** 2;
            if (distanceSquared <= GAP_RADIUS_SQUARED) {
                // 0xAARRGGBB in little endian is B, G, R, A. Zero is transparent.
                const pixel = distanceSquared <= DOT_RADIUS_SQUARED ? 0xff000000 + color : 0;
                bitmap.writeUInt32LE(pixel, (y * size + x) * 4);
            }
        }
    }
}
