/**
 * The little marks that float off a Woka during an emote, drawn as pixel art.
 *
 * They cannot be emoji: a system emoji is a full-colour glyph rendered at font resolution, and next
 * to a 32×32 Woka it looks like a sticker pasted onto the game. These are laid out on the same pixel
 * grid as the sprites, in the palette the rest of the product uses, and rendered as SVG rectangles
 * with crisp edges so they never blur when the camera zooms.
 */

export type WokaEmoteGlyphName = "heart" | "note" | "spark" | "zzz" | "confetti";

interface PixelGlyph {
    /** Fixed colour, or undefined to draw each instance in a different palette colour. */
    color?: string;
    /** One string per row, "x" where a pixel is lit. */
    rows: string[];
}

/** Palette taken from the product's own tokens (libs/tailwind). */
const CONFETTI_COLORS = ["#365dff", "#04f17a", "#f9e81e", "#ff475a", "#56eaff"];

const PIXEL_GLYPHS: Record<WokaEmoteGlyphName, PixelGlyph> = {
    heart: {
        color: "#ff475a",
        rows: [" xx xx ", "xxxxxxx", "xxxxxxx", " xxxxx ", "  xxx  ", "   x   "],
    },
    note: {
        color: "#56eaff",
        rows: ["   xxx", "   x x", "   x x", "   x x", " xxx x", " xxx  "],
    },
    spark: {
        color: "#f9e81e",
        rows: ["  x  ", "  x  ", "xxxxx", "  x  ", "  x  "],
    },
    zzz: {
        color: "#928ebb",
        rows: ["xxxxx", "   x ", "  x  ", " x   ", "xxxxx"],
    },
    confetti: {
        rows: ["xx", "xx"],
    },
};

/**
 * Builds the SVG for one glyph. Everything here comes from the tables above — no caller-supplied
 * string ever reaches the markup.
 */
export function buildGlyphSvg(name: WokaEmoteGlyphName, variant = 0): string {
    const glyph = PIXEL_GLYPHS[name];
    const color = glyph.color ?? CONFETTI_COLORS[Math.abs(variant) % CONFETTI_COLORS.length];
    const width = glyph.rows[0].length;
    const height = glyph.rows.length;

    let rectangles = "";
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (glyph.rows[y][x] === "x") {
                rectangles += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
            }
        }
    }

    return (
        `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="${color}" ` +
        `style="shape-rendering:crispEdges;display:block">${rectangles}</svg>`
    );
}

export function isWokaEmoteGlyphName(value: string): value is WokaEmoteGlyphName {
    return value in PIXEL_GLYPHS;
}
