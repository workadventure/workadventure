import { getColorRgbFromHue } from "../WebRtc/ColorGenerator";

export function getColorByString(str?: string): string | null {
    let hash = 0;
    if (str == undefined || str.length === 0) {
        return null;
    }
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }

    const hue = ((Math.abs(hash) * 197) % 255) / 255;
    const { r, g, b } = getColorRgbFromHue(hue, 0.5, 0.6);
    return `#${((Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255)).toString(16)}`;
}
