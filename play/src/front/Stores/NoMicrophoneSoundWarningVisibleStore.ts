import { derived } from "svelte/store";
import { myMicrophoneStore } from "./MyMediaStore";
import { isLiveStreamingStore } from "./IsStreamingStore";
import { localVolumeStore, silentStore } from "./MediaStore";

const ZERO_SAMPLES_FOR_NO_SOUND_WARNING = 30; // 5 seconds at 100ms (localVolumeStore updates every 100ms)

function isVolumeZero(volume: number[] | undefined): boolean {
    return volume !== undefined && volume.length > 0 && volume.every((v) => v === 0);
}

let noSoundWarningZeroCount = 0;

export const noMicrophoneSoundWarningVisibleStore = derived(
    [localVolumeStore, myMicrophoneStore, isLiveStreamingStore, silentStore],
    ([volume, myMic, isLiveStreaming, silent], set) => {
        const isStreamingContext = isLiveStreaming;
        const shouldDetect = myMic && isStreamingContext && !silent;

        if (shouldDetect && isVolumeZero(volume)) {
            noSoundWarningZeroCount += 1;
            if (noSoundWarningZeroCount >= ZERO_SAMPLES_FOR_NO_SOUND_WARNING) {
                set(true);
                noSoundWarningZeroCount = 0;
            }
        } else {
            noSoundWarningZeroCount = 0;
            if (!shouldDetect || !isVolumeZero(volume)) {
                set(false);
            }
        }
    },
    false
);

/** True when the no-microphone-sound warning should be shown (normal logic OR force for test). */
export const noMicrophoneSoundWarningShowStore = derived(
    [noMicrophoneSoundWarningVisibleStore],
    ([visible]) => visible,
    false
);
