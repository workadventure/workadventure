/**
 * Computes a color from a string (name).
 * @param s
 */
function getColorByString(s: string): string {
    let hash = 0;
    if (s.length === 0) {
        return "#000000";
    }
    for (let i = 0; i < s.length; i++) {
        hash = s.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 255;
        const radix = "00" + value.toString(16);
        color += radix.substring(radix.length - 2);
    }
    return color;
}

/**
 * Get the text color (black or white) for a given background color.
 * @param color: string
 * @return string
 */
function getTextColorByBackgroundColor(color: string | null): string {
    if (!color) {
        return "white";
    }
    const rgb = color.slice(1);
    const brightness = Math.round(
        (parseInt(rgb[0] + rgb[1], 16) * 299 +
            parseInt(rgb[2] + rgb[3], 16) * 587 +
            parseInt(rgb[4] + rgb[5], 16) * 114) /
            1000
    );
    return brightness > 125 ? "black" : "white";
}

function colorChannelMixer(colorChannelA: number, colorChannelB: number, amountToMix: number): number {
    const channelA = colorChannelA * amountToMix;
    const channelB = colorChannelB * (1 - amountToMix);
    return channelA + channelB;
}

function colorMixer(hexA: string, hexB: string, amountToMix: number): string {
    const rgbA = hexToRgb(hexA);
    const rgbB = hexToRgb(hexB);
    if (!rgbA || !rgbB) throw new Error("Invalid hex color");
    const r = colorChannelMixer(rgbA[0], rgbB[0], amountToMix);
    const g = colorChannelMixer(rgbA[1], rgbB[1], amountToMix);
    const b = colorChannelMixer(rgbA[2], rgbB[2], amountToMix);
    return rgbToHex(r, g, b);
}

function componentToHex(c: number) {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex: string): number[] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

export { colorMixer, getColorByString, getTextColorByBackgroundColor };
