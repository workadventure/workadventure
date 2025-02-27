export function getRandomColor(): string {
    const { r, g, b } = getColorRgbFromHue(Math.random());
    return toHexa(r, g, b);
}

function toHexa(r: number, g: number, b: number): string {
    return "#" + Math.floor(r * 256).toString(16) + Math.floor(g * 256).toString(16) + Math.floor(b * 256).toString(16);
}

export function getColorRgbFromHue(
    hue: number,
    saturation = 0.5,
    brightness = 0.95
): { r: number; g: number; b: number } {
    const golden_ratio_conjugate = 0.618033988749895;
    hue += golden_ratio_conjugate;
    hue %= 1;
    return hsv_to_rgb(hue, saturation, brightness);
}

//todo: test this.
function hsv_to_rgb(hue: number, saturation: number, brightness: number): { r: number; g: number; b: number } {
    const h_i = Math.floor(hue * 6);
    const f = hue * 6 - h_i;
    const p = brightness * (1 - saturation);
    const q = brightness * (1 - f * saturation);
    const t = brightness * (1 - (1 - f) * saturation);
    let r: number, g: number, b: number;
    switch (h_i) {
        case 0:
            r = brightness;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = brightness;
            b = p;
            break;
        case 2:
            r = p;
            g = brightness;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = brightness;
            break;
        case 4:
            r = t;
            g = p;
            b = brightness;
            break;
        case 5:
            r = brightness;
            g = p;
            b = q;
            break;
        default:
            throw new Error("h_i cannot be " + h_i);
    }
    return {
        r,
        g,
        b,
    };
}
