import { derived } from "svelte/store";
import { myMicrophoneStore } from "./MyMediaStore";
import { isLiveStreamingStore } from "./IsStreamingStore";
import { localVolumeStore, silentStore, usedMicrophoneDeviceIdStore } from "./MediaStore";
import { microphoneValidatedForDeviceIdStore } from "./MicrophoneValidatedForDeviceIdStore";

const ZERO_SAMPLES_FOR_NO_SOUND_WARNING = 50; // 5 seconds at 100ms (localVolumeStore updates every 100ms)
const MIN_SOUND_SAMPLES_BEFORE_VALIDATION = 10; // 1 second of sustained sound on current device before we validate (avoids validating a new mic with residual sound from the previous one)

function isVolumeZero(volume: number[] | undefined): boolean {
    return volume !== undefined && volume.length > 0 && volume.every((v) => v === 0);
}

let noSoundWarningZeroCount = 0;
let soundValidationSampleCount = 0;
let lastDeviceIdForSoundValidation: string | undefined;

export const noMicrophoneSoundWarningVisibleStore = derived(
    [
        localVolumeStore,
        myMicrophoneStore,
        isLiveStreamingStore,
        silentStore,
        usedMicrophoneDeviceIdStore,
        microphoneValidatedForDeviceIdStore,
    ],
    ([volume, myMic, isLiveStreaming, silent, usedDeviceId, validatedDeviceId], set) => {
        const isStreamingContext = isLiveStreaming;
        const shouldDetect = myMic && isStreamingContext && !silent;
        const isCurrentDeviceValidated =
            validatedDeviceId !== undefined && usedDeviceId !== undefined && usedDeviceId === validatedDeviceId;

        if (shouldDetect && usedDeviceId !== undefined && !isVolumeZero(volume)) {
            if (lastDeviceIdForSoundValidation !== usedDeviceId) {
                lastDeviceIdForSoundValidation = usedDeviceId;
                soundValidationSampleCount = 0;
            }
            soundValidationSampleCount += 1;
            if (soundValidationSampleCount >= MIN_SOUND_SAMPLES_BEFORE_VALIDATION) {
                microphoneValidatedForDeviceIdStore.set(usedDeviceId);
            }
        } else {
            soundValidationSampleCount = 0;
        }

        if (shouldDetect && !isCurrentDeviceValidated && isVolumeZero(volume)) {
            noSoundWarningZeroCount += 1;
            if (noSoundWarningZeroCount >= ZERO_SAMPLES_FOR_NO_SOUND_WARNING) {
                set(true);
                noSoundWarningZeroCount = 0;
            }
        } else {
            noSoundWarningZeroCount = 0;
            if (!shouldDetect || !isVolumeZero(volume) || isCurrentDeviceValidated) {
                set(false);
            }
        }
    },
    false
);
