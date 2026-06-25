import { derived } from "svelte/store";
import { usedMicrophoneDeviceIdStore } from "./MediaStore";
import { microphoneSignalDetectedStore, microphoneSignalDetectionEligibleStore } from "./MicrophoneSignalDetectorStore";
import { microphoneValidatedForDeviceIdStore } from "./MicrophoneValidatedForDeviceIdStore";

const ZERO_SAMPLES_FOR_NO_SOUND_WARNING = 50; // 5 seconds at 100ms
const MIN_SOUND_SAMPLES_BEFORE_VALIDATION = 10; // 1 second of sustained sound on current device before we validate (avoids validating a new mic with residual sound from the previous one)

let noSoundWarningZeroCount = 0;
let soundValidationSampleCount = 0;
let lastDeviceIdForSoundValidation: string | undefined;

export const noMicrophoneSoundWarningVisibleStore = derived(
    [microphoneSignalDetectedStore, microphoneSignalDetectionEligibleStore, usedMicrophoneDeviceIdStore],
    ([signalSample, eligible, usedDeviceId], set) => {
        if (usedDeviceId !== lastDeviceIdForSoundValidation) {
            lastDeviceIdForSoundValidation = usedDeviceId;
            soundValidationSampleCount = 0;
            noSoundWarningZeroCount = 0;
            set(false);
        }

        if (eligible && usedDeviceId !== undefined && signalSample?.detected === true) {
            soundValidationSampleCount += 1;
            if (soundValidationSampleCount >= MIN_SOUND_SAMPLES_BEFORE_VALIDATION) {
                microphoneValidatedForDeviceIdStore.set(usedDeviceId);
            }
        } else {
            soundValidationSampleCount = 0;
        }

        if (eligible && signalSample?.detected === false) {
            noSoundWarningZeroCount += 1;
            if (noSoundWarningZeroCount >= ZERO_SAMPLES_FOR_NO_SOUND_WARNING) {
                set(true);
                noSoundWarningZeroCount = 0;
            }
        } else {
            noSoundWarningZeroCount = 0;
            if (!eligible || signalSample?.detected === true) {
                set(false);
            }
        }
    },
    false,
);
