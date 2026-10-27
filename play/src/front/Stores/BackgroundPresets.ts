import type { CameraBackgroundsData } from "@workadventure/messages";

export interface BackgroundImagePreset {
    /** Stable id, referenced by the admin to hide a built-in image. Never rename one. */
    id: string;
    name: string;
    url: string;
    thumbnail: string;
}

const preset = (id: string, name: string, file: string): BackgroundImagePreset => ({
    id,
    name,
    url: `./static/images/background/${file}`,
    thumbnail: `./static/images/background/thumbnail/${file}`,
});

export const defaultBackgroundImages: BackgroundImagePreset[] = [
    preset("library", "library", "library.jpg"),
    preset("office", "Office", "office.jpg"),
    preset("office-2", "Office 2", "office_2.jpg"),
    preset("pixel-art", "Pixel Art", "pixel_art.jpg"),
    preset("paysage-1", "Paysage", "paysage.jpg"),
    preset("paysage-2", "Paysage 2", "paysage_2.jpg"),
    preset("paysage-3", "Paysage 3", "paysage_3.jpg"),
    preset("paysage-4", "Paysage 4", "paysage_4.jpg"),
    preset("milkyway", "Milkyway", "Milkyway.jpg"),
    preset("chetwode-blue", "Chetwode Blue", "ChetwodeBlue.jpg"),
    preset("fuchsia", "Fuchsia", "Fuchsia.jpg"),
    preset("ronchi", "Ronchi", "Ronchi.jpg"),
];

/** Custom images first, then the built-in ones the world did not hide. No customization = every built-in image. */
export function getAvailableBackgroundImages(
    customization: CameraBackgroundsData | undefined,
): BackgroundImagePreset[] {
    if (!customization) return defaultBackgroundImages;
    const hidden = new Set(customization.hiddenDefaults);
    const defaults = hidden.has("*") ? [] : defaultBackgroundImages.filter((image) => !hidden.has(image.id));
    const custom = customization.custom.map(({ id, name, url, thumbnailUrl }) => ({
        id,
        name,
        url,
        thumbnail: thumbnailUrl,
    }));
    return [...custom, ...defaults];
}
