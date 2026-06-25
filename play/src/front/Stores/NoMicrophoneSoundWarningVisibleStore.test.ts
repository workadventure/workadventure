import { get, writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

type TestStores = Awaited<ReturnType<typeof setupTestStores>>;

async function setupTestStores() {
    vi.resetModules();

    const rawLocalVolumeStore = writable<number[] | undefined>(undefined);
    const localVolumeStore = writable<number[] | undefined>(undefined);
    const silentStore = writable(false);
    const usedMicrophoneDeviceIdStore = writable<string | undefined>("microphone-1");
    const myMicrophoneStore = writable(true);
    const isLiveStreamingAudioStore = writable(true);
    const microphoneValidatedForDeviceIdStore = writable<string | undefined>(undefined);

    vi.doMock("./MediaStore", () => ({
        rawLocalVolumeStore,
        localVolumeStore,
        silentStore,
        usedMicrophoneDeviceIdStore,
    }));
    vi.doMock("./MyMediaStore", () => ({
        myMicrophoneStore,
    }));
    vi.doMock("./IsStreamingStore", () => ({
        isLiveStreamingAudioStore,
    }));
    vi.doMock("./MicrophoneValidatedForDeviceIdStore", () => ({
        microphoneValidatedForDeviceIdStore,
    }));

    const { noMicrophoneSoundWarningVisibleStore } = await import("./NoMicrophoneSoundWarningVisibleStore");

    return {
        isLiveStreamingAudioStore,
        localVolumeStore,
        microphoneValidatedForDeviceIdStore,
        myMicrophoneStore,
        noMicrophoneSoundWarningVisibleStore,
        rawLocalVolumeStore,
        silentStore,
        usedMicrophoneDeviceIdStore,
    };
}

function publishSamples(store: TestStores["rawLocalVolumeStore"], volume: number[] | undefined, count: number): void {
    for (let i = 0; i < count; i += 1) {
        store.set(volume);
    }
}

describe("noMicrophoneSoundWarningVisibleStore", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("shows the warning after 50 zero samples from an unvalidated microphone", async () => {
        const { noMicrophoneSoundWarningVisibleStore, rawLocalVolumeStore } = await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(rawLocalVolumeStore, [0, 0, 0, 0, 0, 0, 0], 49);
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);

        rawLocalVolumeStore.set([0, 0, 0, 0, 0, 0, 0]);

        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(true);
        unsubscribe();
    });

    it("validates the current microphone after 10 non-zero raw samples", async () => {
        const { microphoneValidatedForDeviceIdStore, noMicrophoneSoundWarningVisibleStore, rawLocalVolumeStore } =
            await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(rawLocalVolumeStore, [0, 0, 0, 1, 0, 0, 0], 9);
        expect(get(microphoneValidatedForDeviceIdStore)).toBeUndefined();

        rawLocalVolumeStore.set([0, 0, 0, 1, 0, 0, 0]);

        expect(get(microphoneValidatedForDeviceIdStore)).toBe("microphone-1");
        unsubscribe();
    });

    it("does not show the warning for a validated microphone", async () => {
        const { microphoneValidatedForDeviceIdStore, noMicrophoneSoundWarningVisibleStore, rawLocalVolumeStore } =
            await setupTestStores();
        microphoneValidatedForDeviceIdStore.set("microphone-1");
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        publishSamples(rawLocalVolumeStore, [0, 0, 0, 0, 0, 0, 0], 50);

        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);
        unsubscribe();
    });

    it("uses raw volume for the warning instead of processed local volume", async () => {
        const {
            localVolumeStore,
            microphoneValidatedForDeviceIdStore,
            noMicrophoneSoundWarningVisibleStore,
            rawLocalVolumeStore,
            usedMicrophoneDeviceIdStore,
        } = await setupTestStores();
        const unsubscribe = noMicrophoneSoundWarningVisibleStore.subscribe(() => undefined);

        localVolumeStore.set([0, 0, 0, 0, 0, 0, 0]);
        publishSamples(rawLocalVolumeStore, [0, 0, 0, 1, 0, 0, 0], 10);

        expect(get(microphoneValidatedForDeviceIdStore)).toBe("microphone-1");
        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(false);

        usedMicrophoneDeviceIdStore.set("microphone-2");
        publishSamples(rawLocalVolumeStore, [0, 0, 0, 0, 0, 0, 0], 50);

        expect(get(noMicrophoneSoundWarningVisibleStore)).toBe(true);
        unsubscribe();
    });
});
