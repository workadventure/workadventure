/**
 * Video presets for adaptive bitrate and resolution control.
 * Extracted from LiveKit client configuration.
 */

export class VideoPreset {
    constructor(
        readonly width: number,
        readonly height: number,
        readonly bitrate: number,
        readonly fps: number,
        readonly scalabilityMode?: string
    ) {}
}

export const VideoPresets = {
    h90: new VideoPreset(160, 90, 90_000, 20),
    h180: new VideoPreset(320, 180, 160_000, 20),
    h216: new VideoPreset(384, 216, 180_000, 20),
    h360: new VideoPreset(640, 360, 450_000, 20),
    h540: new VideoPreset(960, 540, 800_000, 25),
    h720: new VideoPreset(1280, 720, 1_700_000, 30),
    h1080: new VideoPreset(1920, 1080, 3_000_000, 30),
    h1440: new VideoPreset(2560, 1440, 5_000_000, 30),
    h2160: new VideoPreset(3840, 2160, 8_000_000, 30),
} as const;

export const ScreenSharePresets = {
    h360fps3: new VideoPreset(640, 360, 200_000, 3, "medium"),
    h360fps15: new VideoPreset(640, 360, 400_000, 15, "medium"),
    h720fps5: new VideoPreset(1280, 720, 800_000, 5, "medium"),
    h720fps15: new VideoPreset(1280, 720, 1_500_000, 15, "medium"),
    h720fps30: new VideoPreset(1280, 720, 2_000_000, 30, "medium"),
    h1080fps15: new VideoPreset(1920, 1080, 2_500_000, 15, "medium"),
    h1080fps30: new VideoPreset(1920, 1080, 5_000_000, 30, "medium"),
    // original resolution, without resizing
    original: new VideoPreset(0, 0, 7_000_000, 30, "medium"),
} as const;

/**
 * Select the most appropriate VideoPreset based on display dimensions.
 * For screen sharing, returns the preset with the closest height that doesn't exceed the display height.
 * For regular video, selects based on a reasonable mapping of container height to preset.
 */
export function selectVideoPreset(displayHeight: number, displayWidth: number, isScreenShare: boolean): VideoPreset {
    if (isScreenShare) {
        // For screen sharing, try to match the actual screen dimensions
        // Return the preset with height >= display height, or the highest preset if all are too small
        const presetArray = Object.values(ScreenSharePresets);
        let bestPreset = presetArray[0];

        for (const preset of presetArray) {
            if (preset.height === 0) {
                // Skip the "original" preset for now
                continue;
            }
            if (preset.height >= displayHeight) {
                bestPreset = preset;
                break;
            }
            bestPreset = preset;
        }
        return bestPreset;
    }

    // For regular video, map display height to preset
    // If display height is very small, use lower presets
    if (displayHeight <= 90) return VideoPresets.h90;
    if (displayHeight <= 180) return VideoPresets.h180;
    if (displayHeight <= 216) return VideoPresets.h216;
    if (displayHeight <= 360) return VideoPresets.h360;
    if (displayHeight <= 540) return VideoPresets.h540;
    if (displayHeight <= 720) return VideoPresets.h720;
    if (displayHeight <= 1080) return VideoPresets.h1080;
    if (displayHeight <= 1440) return VideoPresets.h1440;
    return VideoPresets.h2160;
}
