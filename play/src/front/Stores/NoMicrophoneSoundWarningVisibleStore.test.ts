import { get, writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MicrophoneSignalSample } from "./MicrophoneSignalDetectorStore";

type TestStores = Awaited<ReturnType<typeof setupTestStores>>;

async function setupTestStores() {
    vi.resetModules();

    const microphoneSignalDetectedStore = writable<MicrophoneSignalSample | undefined>(undefined);
    const usedMicrophoneDeviceIdStore = writable<string | undefined>("microphone-1");
    const microphoneValidatedForDeviceIdStore = writable<string | undefined>(undefined);

    vi.doMock("./MicrophoneSignalDetectorStore", () => ({
        microphoneSignalDetectedStore,
    }));
    vi.doMock("./MediaStore", () => ({
        usedMicrophoneDeviceIdStore,
    }));
    vi.doMock("./MicrophoneValidatedForDeviceIdStore", () => ({
        microphoneValidatedForDeviceIdStore,
    }));

    const { noMicrophoneSoundWarningVisibleStore } = await import("./NoMicrophoneSoundWarningVisibleStore");

    return {
        microphoneSignalDetectedStore,
        microphoneValidatedForDeviceIdStore,
        noMicrophoneSoundWarningVisibleStore,
        usedMicrophoneDeviceIdStore,
    };
}

function publishSamples(store: TestStores["microphoneSignalDetectedStore"], detected: boolean, count: number): void {
    for (let i = 0; i < count; i += 1) {
        // A new object per poll, like microphoneSignalDetectedStore does
        store.set({ detected });
    }
}

describe("noMicrophoneSoundWarningVisibleStore", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("shows the warning after 50 samples without a microphone signal", async () => {
        const { microphoneSignalDetectedStore, noMicrophoneSoundWarningVisibleStore } = await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(microphoneSignalDetectedStore, false, 49);
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);

        publishSamples(microphoneSignalDetectedStore, false, 1);

        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(true);
        unsubscribe();
    });

    it("keeps the warning visible while silence continues and hides it when a signal is detected", async () => {
        const { microphoneSignalDetectedStore, noMicrophoneSoundWarningVisibleStore } = await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(microphoneSignalDetectedStore, false, 60);
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(true);

        publishSamples(microphoneSignalDetectedStore, true, 1);

        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);
        unsubscribe();
    });

    it("hides the warning when detection stops being eligible", async () => {
        const { microphoneSignalDetectedStore, noMicrophoneSoundWarningVisibleStore } = await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(microphoneSignalDetectedStore, false, 50);
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(true);

        microphoneSignalDetectedStore.set(undefined);

        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);
        unsubscribe();
    });

    it("validates the current microphone after 10 samples with a signal", async () => {
        const {
            microphoneSignalDetectedStore,
            microphoneValidatedForDeviceIdStore,
            noMicrophoneSoundWarningVisibleStore,
        } = await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(microphoneSignalDetectedStore, true, 9);
        expect(get(microphoneValidatedForDeviceIdStore)).toBeUndefined();

        publishSamples(microphoneSignalDetectedStore, true, 1);

        expect(get(microphoneValidatedForDeviceIdStore)).toBe("microphone-1");
        unsubscribe();
    });

    it("resets the counters when the microphone device changes", async () => {
        const { microphoneSignalDetectedStore, noMicrophoneSoundWarningVisibleStore, usedMicrophoneDeviceIdStore } =
            await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(microphoneSignalDetectedStore, false, 49);
        usedMicrophoneDeviceIdStore.set("microphone-2");

        publishSamples(microphoneSignalDetectedStore, false, 49);
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);

        publishSamples(microphoneSignalDetectedStore, false, 1);

        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(true);
        unsubscribe();
    });

    it("warns for a new unvalidated device after the previous one was validated", async () => {
        const {
            microphoneSignalDetectedStore,
            microphoneValidatedForDeviceIdStore,
            noMicrophoneSoundWarningVisibleStore,
            usedMicrophoneDeviceIdStore,
        } = await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(microphoneSignalDetectedStore, true, 10);
        expect(get(microphoneValidatedForDeviceIdStore)).toBe("microphone-1");
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);

        usedMicrophoneDeviceIdStore.set("microphone-2");
        publishSamples(microphoneSignalDetectedStore, false, 50);

        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(true);
        unsubscribe();
    });
});
