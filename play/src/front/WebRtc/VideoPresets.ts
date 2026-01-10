interface Preset {
    pixels: number;
    bitrate: number;
    fps: number;
}

const videoPresets: Preset[] = [
    {
        pixels: 160 * 90,
        bitrate: 90_000,
        fps: 20,
    },
    {
        pixels: 320 * 180,
        bitrate: 160_000,
        fps: 20,
    },
    {
        pixels: 384 * 216,
        bitrate: 180_000,
        fps: 20,
    },
    {
        pixels: 640 * 360,
        bitrate: 450_000,
        fps: 20,
    },
    {
        pixels: 960 * 540,
        bitrate: 800_000,
        fps: 20,
    },
    {
        pixels: 1280 * 720,
        bitrate: 1_700_000,
        fps: 30,
    },
    {
        pixels: 1920 * 1080,
        bitrate: 3_000_000,
        fps: 30,
    },
    {
        pixels: 2560 * 1440,
        bitrate: 5_000_000,
        fps: 30,
    },
    {
        pixels: 3840 * 2160,
        bitrate: 8_000_000,
        fps: 30,
    },
];

const videoMaxPreset = {
    pixels: 0,
    bitrate: 8_000_000,
    fps: 30,
};

const screenSharePresets: Preset[] = [
    {
        pixels: 640 * 360,
        bitrate: 400_000,
        fps: 15,
    },
    {
        pixels: 1280 * 720,
        bitrate: 1_500_000,
        fps: 15,
    },
    {
        pixels: 1920 * 1080,
        bitrate: 2_500_000,
        fps: 15,
    },
];

const screenShareMaxPreset: Preset = {
    pixels: 0,
    bitrate: 7_000_000,
    fps: 15,
};

/**
 * Select the most appropriate bandwidth and fps for your resolution.
 */
export function selectVideoPreset(
    displayHeight: number,
    displayWidth: number,
    isScreenShare: boolean
): {
    bitrate: number;
    fps: number;
} {
    if (isScreenShare) {
        return selectPreset(displayWidth, displayHeight, screenSharePresets, screenShareMaxPreset);
    } else {
        return selectPreset(displayWidth, displayHeight, videoPresets, videoMaxPreset);
    }
}

function selectPreset(
    width: number,
    height: number,
    presets: Preset[],
    maxPreset: Preset
): {
    bitrate: number;
    fps: number;
} {
    for (const preset of presets) {
        if (width * height <= preset.pixels) {
            return {
                bitrate: preset.bitrate,
                fps: preset.fps,
            };
        }
    }
    return maxPreset;
}
