import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

/**
 * Covers which output device gets picked and, just as importantly, what must never be overwritten.
 *
 * The module reads its initial value from local storage at import time, so every test reloads it.
 */

function audioOutput(deviceId: string, label = `Speaker ${deviceId}`): MediaDeviceInfo {
    return { deviceId, label, kind: "audiooutput", groupId: "group" } as MediaDeviceInfo;
}

async function loadStore(storedDeviceId?: string) {
    if (storedDeviceId !== undefined) {
        localStorage.setItem("speakerDeviceId", storedDeviceId);
    }
    vi.resetModules();
    return import("../../../src/front/Stores/AudioOutputStore");
}

// The first import transforms the whole module graph, which can exceed a single test's timeout on a cold
// cache. Paying it here keeps that cost out of the tests, which reload the (by then cached) module.
beforeAll(async () => {
    await import("../../../src/front/Stores/AudioOutputStore");
}, 60_000);

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    localStorage.clear();
});

describe("applyDefaultSpeaker", () => {
    it("picks the first device without overwriting the stored preference", async () => {
        const stores = await loadStore("headset");

        stores.applyDefaultSpeaker([audioOutput("speaker-a"), audioOutput("speaker-b")]);

        expect(get(stores.speakerSelectedStore)).toBe("speaker-a");
        // The device list subscriber restores the stored preference once its device is back: persisting
        // the fallback would lose the headset for good after an unplug or a Bluetooth drop.
        expect(localStorage.getItem("speakerDeviceId")).toBe("headset");
    });

    it("falls back to the system default when there is no device", async () => {
        const stores = await loadStore();

        stores.applyDefaultSpeaker([]);

        expect(get(stores.speakerSelectedStore)).toBe("");
    });
});

describe("reconcileSpeakerSelection", () => {
    it("keeps a selection that still exists", async () => {
        const stores = await loadStore("speaker-b");

        stores.reconcileSpeakerSelection([audioOutput("speaker-a"), audioOutput("speaker-b")]);

        expect(get(stores.speakerSelectedStore)).toBe("speaker-b");
    });

    it("falls back when the selected device was unplugged", async () => {
        const stores = await loadStore("speaker-b");

        stores.reconcileSpeakerSelection([audioOutput("speaker-a")]);

        expect(get(stores.speakerSelectedStore)).toBe("speaker-a");
        expect(localStorage.getItem("speakerDeviceId")).toBe("speaker-b");
    });

    it("keeps the stored preference when no output is reported at all", async () => {
        const stores = await loadStore("speaker-b");

        stores.reconcileSpeakerSelection([]);

        // An empty list means the browser will not tell us about outputs yet, typically because no
        // permission was granted. Enumeration now happens before any getUserMedia, so treating this
        // as "the device disappeared" would destroy a valid preference before it was ever used.
        expect(get(stores.speakerSelectedStore)).toBe("speaker-b");
        expect(localStorage.getItem("speakerDeviceId")).toBe("speaker-b");
    });

    it("keeps the stored preference when Chrome only reports its pre-permission placeholder", async () => {
        const stores = await loadStore("speaker-b");

        stores.reconcileSpeakerSelection(stores.selectableSpeakers([audioOutput("", "")]));

        expect(get(stores.speakerSelectedStore)).toBe("speaker-b");
        expect(localStorage.getItem("speakerDeviceId")).toBe("speaker-b");
    });

    it("does nothing while the device list is unknown", async () => {
        const stores = await loadStore("speaker-b");

        stores.reconcileSpeakerSelection(undefined);

        expect(get(stores.speakerSelectedStore)).toBe("speaker-b");
    });

    it("restores the preference once its device comes back", async () => {
        const stores = await loadStore("speaker-b");

        stores.reconcileSpeakerSelection([audioOutput("speaker-a")]);
        expect(get(stores.speakerSelectedStore)).toBe("speaker-a");

        // Re-selecting by hand is what a user does after plugging the headset back in; the point
        // here is that reconciling again does not undo it.
        stores.speakerSelectedStore.set("speaker-b");
        stores.reconcileSpeakerSelection([audioOutput("speaker-a"), audioOutput("speaker-b")]);

        expect(get(stores.speakerSelectedStore)).toBe("speaker-b");
    });
});

describe("usedSpeakerDeviceIdStore", () => {
    it("is cleared whenever another device is picked", async () => {
        const stores = await loadStore();
        stores.usedSpeakerDeviceIdStore.set("speaker-a");

        stores.speakerSelectedStore.set("speaker-b");

        // Nothing has routed audio to the new device yet, so reporting the old one would read as a
        // mismatch and make the settings panel claim a fallback that never happened.
        expect(get(stores.usedSpeakerDeviceIdStore)).toBeUndefined();
    });
});
