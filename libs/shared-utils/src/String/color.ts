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

export { getColorByString, getTextColorByBackgroundColor };
