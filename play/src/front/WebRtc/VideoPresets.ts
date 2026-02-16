export type VideoQualitySetting = "low" | "recommended" | "high";

interface Preset {
    pixels: number;
    bitrate: {
        low: number;
        recommended: number;
        high: number;
    };
    fps: {
        low: number;
        recommended: number;
        high: number;
    };
}

// Source: https://livekit.io/webrtc/bitrate-guide
export const videoPresets = {
    h90: {
        pixels: 160 * 90,
        bitrate: {
            low: 20_000,
            recommended: 35_000,
            high: 80_000,
        },
        fps: {
            low: 15,
            recommended: 20,
            high: 30,
        },
    },
    h180: {
        pixels: 320 * 180,
        bitrate: {
            low: 50_000,
            recommended: 90_000,
            high: 210_000,
        },
        fps: {
            low: 15,
            recommended: 20,
            high: 30,
        },
    },
    h216: {
        pixels: 384 * 216,
        bitrate: {
            low: 70_000,
            recommended: 120_000,
            high: 250_000,
        },
        fps: {
            low: 15,
            recommended: 20,
            high: 30,
        },
    },
    h360: {
        pixels: 640 * 360,
        bitrate: {
            low: 150_000,
            recommended: 270_000,
            high: 550_000,
        },
        fps: {
            low: 15,
            recommended: 20,
            high: 30,
        },
    },
    h540: {
        pixels: 960 * 540,
        bitrate: {
            low: 260_000,
            recommended: 450_000,
            high: 1_100_000,
        },
        fps: {
            low: 15,
            recommended: 20,
            high: 30,
        },
    },
    h720: {
        pixels: 1280 * 720,
        bitrate: {
            low: 400_000,
            recommended: 700_000,
            high: 1_800_000,
        },
        fps: {
            low: 20,
            recommended: 30,
            high: 30,
        },
    },
    h1080: {
        pixels: 1920 * 1080,
        bitrate: {
            low: 700_000,
            recommended: 1_200_000,
            high: 4_000_000,
        },
        fps: {
            low: 20,
            recommended: 30,
            high: 30,
        },
    },
    h1440: {
        pixels: 2560 * 1440,
        bitrate: {
            low: 1_000_000,
            recommended: 5_000_000,
            high: 8_700_000,
        },
        fps: {
            low: 20,
            recommended: 30,
            high: 30,
        },
    },
    h2160: {
        pixels: 3840 * 2160,
        bitrate: {
            low: 1_500_000,
            recommended: 8_000_000,
            high: 18_000_000,
        },
        fps: {
            low: 20,
            recommended: 30,
            high: 30,
        },
    },
} satisfies Record<string, Preset>;

const videoMaxPreset: Preset = {
    pixels: 0,
    bitrate: {
        low: 2_000_000,
        recommended: 8_000_000,
        high: 10_000_000,
    },
    fps: {
        low: 20,
        recommended: 30,
        high: 30,
    },
};

export const screenSharePresets = {
    h360: {
        pixels: 640 * 360,
        bitrate: {
            low: 150_000,
            recommended: 400_000,
            high: 800_000,
        },
        fps: {
            low: 15,
            recommended: 30,
            high: 60,
        },
    },
    h720: {
        pixels: 1280 * 720,
        bitrate: {
            low: 400_000,
            recommended: 1_500_000,
            high: 2_500_000,
        },
        fps: {
            low: 15,
            recommended: 30,
            high: 60,
        },
    },
    h1080: {
        pixels: 1920 * 1080,
        bitrate: {
            low: 700_000,
            recommended: 2_500_000,
            high: 4_000_000,
        },
        fps: {
            low: 15,
            recommended: 30,
            high: 60,
        },
    },
} satisfies Record<string, Preset>;

const screenShareMaxPreset: Preset = {
    pixels: 0,
    bitrate: {
        low: 1_000_000,
        recommended: 4_000_000,
        high: 7_000_000,
    },
    fps: {
        low: 15,
        recommended: 30,
        high: 60,
    },
};

/**
 * Select the most appropriate bandwidth and fps for your resolution.
 */
export function selectVideoPreset(
    displayHeight: number,
    displayWidth: number,
    isScreenShare: boolean,
    quality: VideoQualitySetting
): {
    bitrate: number;
    fps: number;
} {
    if (isScreenShare) {
        return selectPreset(
            displayWidth,
            displayHeight,
            Object.values(screenSharePresets),
            screenShareMaxPreset,
            quality
        );
    } else {
        return selectPreset(displayWidth, displayHeight, Object.values(videoPresets), videoMaxPreset, quality);
    }
}

function selectPreset(
    width: number,
    height: number,
    presets: Preset[],
    maxPreset: Preset,
    quality: VideoQualitySetting
): {
    bitrate: number;
    fps: number;
} {
    for (const preset of presets) {
        if (width * height <= preset.pixels) {
            return {
                bitrate: preset.bitrate[quality],
                fps: preset.fps[quality],
            };
        }
    }
    return {
        bitrate: maxPreset.bitrate[quality],
        fps: maxPreset.fps[quality],
    };
}
