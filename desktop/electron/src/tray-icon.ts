import type { TrayStatus } from "./presence";

/** Side of the tray icon in points. It is pixel art, so it is only ever drawn at whole multiples. */
export const TRAY_ICON_SIZE = 16;

// Status-dot colors. Mirror WA's own availability colors (the `filling` values in
// play/src/front/Utils/AvailabilityStatus.ts getColorHexOfStatus): busy gold, back-in-a-moment blue,
// do-not-disturb coral. Idle reuses WA's AWAY gold; meeting reuses WA's SILENT red as a "busy in a
// meeting" signal. Online is the resting state: the bare cup, no dot.
const DOT_COLOR: Record<TrayStatus, number | undefined> = {
    online: undefined,
    meeting: 0xe74c3c,
    do_not_disturb: 0xe96e53,
    busy: 0xe9c84e,
    back_in_a_moment: 0x7382e2,
    idle: 0xe9c84e,
    offline: 0x6b7280,
};

// W cup, L its shaded edge, S steam, K keyline. The keyline is the logo's navy: invisible on a dark bar,
// and what makes the white cup readable on a light one. The bar's color cannot be asked for (Ubuntu's is
// dark in light mode too, the macOS one follows the wallpaper), so a single icon has to work on both.
const PALETTE: Record<string, number | undefined> = {
    W: 0xffffff,
    L: 0xcdd4dc,
    S: 0x7d93ab,
    K: 0x14304c,
};

// The logo's cup redrawn for 16 px. The logo itself is a 26 px wide sprite on a navy tile: scaled down
// to tray size the cup is a blur, and the tile is lost on a dark bar.
const CUP = [
    "................",
    "...S..S..S......",
    "..S..S..S.......",
    "...S..S..S......",
    "KKKKKKKKKKKKK...",
    "KWWWWWWWWWWLKKKK",
    "KWWWWWWWWWWLWWWK",
    "KWWWWWWWWWWLKKWK",
    "KWWWWWWWWWWLKKWK",
    "KWWWWWWWWWWLKKWK",
    "KWWWWWWWWWWLWWKK",
    "KWWWWWWWWWWLKKK.",
    "KWWWWWWWWWLLK...",
    "KKWWWWWWWLLKK...",
    ".KKLLLLLLLKK....",
    "..KKKKKKKKK.....",
];

// The same cup with the status dot (D) in its corner, and a transparent gap that sets the dot apart.
const CUP_WITH_DOT = [
    "................",
    "...S..S..S......",
    "..S..S..S.......",
    "...S..S..S......",
    "KKKKKKKKKKKKK...",
    "KWWWWWWWWWWLKKKK",
    "KWWWWWWWWWWLWWWK",
    "KWWWWWWWWWWLKKWK",
    "KWWWWWWWWWWLKKWK",
    "KWWWWWWWWW......",
    "KWWWWWWWW..DDDD.",
    "KWWWWWWWW.DDDDDD",
    "KWWWWWWWW.DDDDDD",
    "KKWWWWWWW.DDDDDD",
    ".KKLLLLLL.DDDDDD",
    "..KKKKKKK..DDDD.",
];

/**
 * The tray icon of a status as BGRA pixels (what nativeImage.createFromBitmap takes), `scale` times
 * TRAY_ICON_SIZE wide. Every pixel is fully opaque or fully transparent, so premultiplied or not is
 * the same buffer.
 */
export function renderTrayIcon(status: TrayStatus, scale: number): Buffer {
    const dotColor = DOT_COLOR[status];
    const rows = dotColor === undefined ? CUP : CUP_WITH_DOT;
    const size = TRAY_ICON_SIZE * scale;
    // Zero-filled, hence transparent.
    const buffer = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const symbol = rows[Math.floor(y / scale)]?.[Math.floor(x / scale)] ?? ".";
            const color = symbol === "D" ? dotColor : PALETTE[symbol];
            if (color !== undefined) {
                // 0xAARRGGBB in little endian is B, G, R, A.
                buffer.writeUInt32LE(0xff000000 + color, (y * size + x) * 4);
            }
        }
    }
    return buffer;
}
