import chroma from "chroma-js";

export const getHslColor = (color: string): string => {
    const hsl = chroma(color).hsl();
    return `${Math.round(hsl[0])} ${Math.round(hsl[1] * 100)}% ${Math.round(hsl[2] * 100)}%`;
};

export const getPalette = (hex: string | null | undefined) => {
    if (!hex) {
        return [];
    }
    const colors = chroma.scale(["white", hex, "black"]);
    const palette = [];
    // Create 50
    palette.push({ code: 50, color: getHslColor(colors(0.05).hex()) });

    // Create 100-900
    for (let i = 0.1; i < 0.9; i += 0.1) {
        let step = `-${Math.round(i * 1000)}`;
        if (i == 0.5) {
            step = "";
        }
        palette.push({ code: step, color: getHslColor(colors(i).hex()) });
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
