import chroma from "chroma-js";

interface PaletteColor {
    code: string;
    color: string;
}
export const getHslColor = (color: string): string => {
    const hsl = chroma(color).hsl();
    if (isNaN(hsl[0])) {
        hsl[0] = 0;
    }
    return `${Math.round(hsl[0])} ${Math.round(hsl[1] * 100) ?? 0}% ${Math.round(hsl[2] * 100)}%`;
};

export const getPalette = (hex: string | null | undefined) => {
    if (!hex) {
        return [];
    }
    const colors = chroma.scale(["white", hex, "black"]).colors(12, "hex");
    const palette: PaletteColor[] = [];
    // Create 50
    palette.push({ code: "-50", color: getHslColor(colors[1]) });
    // Create 100-900
    for (let i = 0.1; i < 0.9; i += 0.1) {
        let step = `-${Math.round(i * 1000)}`;
        if (i == 0.5) {
            step = "";
        }
        palette.push({ code: step, color: getHslColor(colors[Math.round(i * 10)]) });
    }
    return palette;
};

export const getStringPalette = (hex: string | null | undefined, prefix: string): string => {
    const palette = getPalette(hex);
    let stringPalette = "";
    for (const color of palette) {
        stringPalette += `--${prefix}${color.code}: ${color.color};\n`;
    }
    return stringPalette;
};

export const wrapWithStyleTag = (stringPalette: string): string => {
    return `<style>\n
        :root {\n
            ${stringPalette}
            }\n
        </style>`;
};
