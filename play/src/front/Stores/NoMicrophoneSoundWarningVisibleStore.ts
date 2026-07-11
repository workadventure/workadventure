import { derived, get } from "svelte/store";
import { usedMicrophoneDeviceIdStore } from "./MediaStore";
import { microphoneValidatedForDeviceIdStore } from "./MicrophoneValidatedForDeviceIdStore";
import { microphoneSignalDetectedStore } from "./MicrophoneSignalDetectorStore";

const SILENT_SAMPLES_FOR_NO_SOUND_WARNING = 50; // 5 seconds at 100ms (microphoneSignalDetectedStore polls every 100ms)
const MIN_SOUND_SAMPLES_BEFORE_VALIDATION = 10; // 1 second of sustained sound on current device before we validate (avoids validating a new mic with residual sound from the previous one)

let noSoundWarningSilentCount = 0;
let soundValidationSampleCount = 0;
let lastDeviceIdForSoundValidation: string | undefined;

/**
 * Shows the "no sound detected from your microphone" warning after 5 seconds without any signal
 * from the microphone while we are expected to stream audio.
 *
 * Detection relies on microphoneSignalDetectedStore, which computes the time-domain RMS of the raw
 * (pre-noise-suppression) stream and therefore reacts to a signal anywhere in the spectrum. The
 * previous implementation sampled a handful of frequency bars in the 3.75-6 kHz range only, and
 * reported silence for perfectly working microphones producing low-frequency signals (including
 * the fake microphones used by the E2E tests).
 */
export const noMicrophoneSoundWarningVisibleStore = derived(
    microphoneSignalDetectedStore,
    (sample, set) => {
        // No sample: detection is not eligible (microphone off, not streaming audio, silent zone,
        // or the current device is already validated).
        if (sample === undefined) {
            noSoundWarningSilentCount = 0;
            soundValidationSampleCount = 0;
            set(false);
            return;
        }

        const usedDeviceId = get(usedMicrophoneDeviceIdStore);
        if (lastDeviceIdForSoundValidation !== usedDeviceId) {
            lastDeviceIdForSoundValidation = usedDeviceId;
            noSoundWarningSilentCount = 0;
            soundValidationSampleCount = 0;
        }

        if (sample.detected) {
            noSoundWarningSilentCount = 0;
            if (usedDeviceId !== undefined) {
                soundValidationSampleCount += 1;
                if (soundValidationSampleCount >= MIN_SOUND_SAMPLES_BEFORE_VALIDATION) {
                    microphoneValidatedForDeviceIdStore.set(usedDeviceId);
                }
            }
            set(false);
        } else {
            soundValidationSampleCount = 0;
            noSoundWarningSilentCount += 1;
            if (noSoundWarningSilentCount >= SILENT_SAMPLES_FOR_NO_SOUND_WARNING) {
                // Keep the warning visible while the microphone stays silent: it only hides once a
                // signal is detected or detection stops being eligible.
                set(true);
                noSoundWarningSilentCount = 0;
            }
        }
    },
    false,
);
