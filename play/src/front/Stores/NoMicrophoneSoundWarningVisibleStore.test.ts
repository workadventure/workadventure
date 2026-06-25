import { describe, expect, it, vi } from "vitest";
import type { Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import type { MicrophoneSignalSample } from "./MicrophoneSignalDetectorStore";

vi.mock("./MediaStore", () => ({
    usedMicrophoneDeviceIdStore: writable<string | undefined>(undefined),
}));

vi.mock("./MicrophoneSignalDetectorStore", () => ({
    microphoneSignalDetectedStore: writable<{ detected: boolean } | undefined>(undefined),
    microphoneSignalDetectionEligibleStore: writable(false),
}));

vi.mock("./MicrophoneValidatedForDeviceIdStore", () => ({
    microphoneValidatedForDeviceIdStore: writable<string | undefined>(undefined),
}));

import { usedMicrophoneDeviceIdStore } from "./MediaStore";
import { microphoneSignalDetectedStore, microphoneSignalDetectionEligibleStore } from "./MicrophoneSignalDetectorStore";
import { microphoneValidatedForDeviceIdStore } from "./MicrophoneValidatedForDeviceIdStore";
import { noMicrophoneSoundWarningVisibleStore } from "./NoMicrophoneSoundWarningVisibleStore";

describe("NoMicrophoneSoundWarningVisibleStore", () => {
    it("counts consecutive identical detector samples", () => {
        const signalStore = microphoneSignalDetectedStore as unknown as Writable<MicrophoneSignalSample | undefined>;
        const eligibilityStore = microphoneSignalDetectionEligibleStore as unknown as Writable<boolean>;
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);
        usedMicrophoneDeviceIdStore.set("microphone-1");
        eligibilityStore.set(true);

        for (let sample = 0; sample < 49; sample += 1) {
            signalStore.set({ detected: false });
        }
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);

        signalStore.set({ detected: false });
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(true);

        usedMicrophoneDeviceIdStore.set("microphone-2");
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);

        for (let sample = 0; sample < 10; sample += 1) {
            signalStore.set({ detected: true });
        }
        expect(get(microphoneValidatedForDeviceIdStore)).toBe("microphone-2");

        unsubscribe();
    });
});
