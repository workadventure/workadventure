/**
 * The little marks that float off a Woka during an emote, drawn as pixel art.
 *
 * They cannot be emoji: a system emoji is a full-colour glyph rendered at font resolution, and next
 * to a 32×32 Woka it looks like a sticker pasted onto the game. These are laid out on the same pixel
 * grid as the sprites, in the palette the rest of the product uses, and rendered as SVG rectangles
 * with crisp edges so they never blur when the camera zooms.
 */

export type WokaEmoteGlyphName =
    | "heart"
    | "note"
    | "spark"
    | "zzz"
    | "question"
    | "confetti"
    | "laugh"
    | "boot"
    | "impact"
    | "star"
    | "cell"
    | "grawlix"
    | "dust";

interface PixelGlyph {
    /** Fixed colour, or undefined to draw each instance in a different palette colour. */
    color?: string;
    /** One string per row, "x" where a pixel is lit — or a letter of `palette` for multicolour art. */
    rows: string[];
    /** Colour of each letter, for glyphs drawn with more than one colour. */
    palette?: Record<string, string>;
}

/** The jail cell of a ban: a plate on top and at the bottom, two-pixel bars in between. */
function cellRows(): string[] {
    const width = 24;
    const height = 30;
    const rows: string[] = [];
    for (let y = 0; y < height; y++) {
        let row = "";
        for (let x = 0; x < width; x++) {
            if (y === 0 || y === height - 1) row += "k";
            else if (y <= 2 || y >= height - 2) row += [2, 11, 20].includes(x) ? "l" : "m";
            else row += x % 4 === 0 ? "k" : x % 4 === 1 ? "l" : " ";
        }
        rows.push(row);
    }
    return rows;
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
    question: {
        color: "#f9e81e",
        rows: [" xxx ", "x   x", "    x", "   x ", "  x  ", "     ", "  x  "],
    },
    confetti: {
        rows: ["xx", "xx"],
    },
    // Lettering rather than a face: at seven pixels wide a smiley is a blob, whereas "HA" is
    // legible and reads as laughter the same way `zzz` reads as sleep.
    laugh: {
        color: "#f9e81e",
        rows: ["x x  x ", "x x x x", "xxx xxx", "x x x x", "x x x x"],
    },
    // The ejection props (see WokaEjectionCatalog). A boot with a trouser cuff, facing right.
    boot: {
        palette: { p: "#365dff", q: "#2440b8", b: "#8a5a2b", d: "#5e3b1a", w: "#d9a066", s: "#2a1c10" },
        rows: [
            "  qppq       ",
            "  qppq       ",
            "  dbbd       ",
            "  dbbd       ",
            "  dbbbbbbd   ",
            " dbwbbbbbbbd ",
            " dbbbbbbbbbbd",
            " sssssssssss ",
        ],
    },
    impact: {
        palette: { y: "#f9e81e", w: "#ffffff", o: "#ff9a1e" },
        rows: [
            "o   y   o",
            " o  y  o ",
            "  o w o  ",
            "   www   ",
            "yywwwwwyy",
            "   www   ",
            "  o w o  ",
            " o  y  o ",
            "o   y   o",
        ],
    },
    star: {
        palette: { y: "#f9e81e", w: "#ffffff", o: "#ffb81e" },
        rows: [
            "    y    ",
            "    y    ",
            "   oyo   ",
            "  oywyo  ",
            "yyywwwyyy",
            "  oywyo  ",
            "   oyo   ",
            "    y    ",
            "    y    ",
        ],
    },
    cell: {
        palette: { k: "#2b2a3d", m: "#6f6c8d", l: "#c9c6e0" },
        rows: cellRows(),
    },
    // Cartoon swearing: a hash and a spiral, the comic-strip way of saying it without saying it.
    grawlix: {
        palette: { r: "#ff475a", k: "#1b1b29" },
        rows: ["r r  kkk  r", "rrr k   k r", "r r  kkk   ", "rrr k   k r", "r r  kkk  r"],
    },
    dust: {
        color: "#b9b5cf",
        rows: [" xx ", "xxxx", " xx "],
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
            const pixel = glyph.rows[y][x];
            const fill = glyph.palette?.[pixel];
            if (fill) {
                rectangles += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
            } else if (pixel === "x") {
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
