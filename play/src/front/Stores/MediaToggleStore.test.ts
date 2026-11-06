import type { Readable, Writable } from "svelte/store";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    trackAdminEvent: vi.fn(),
    toggleCamera: vi.fn(),
    toggleMicrophone: vi.fn(),
}));

vi.mock("../Administration/AnalyticsClient", () => ({
    analyticsClient: { trackAdminEvent: mocks.trackAdminEvent },
}));

vi.mock("./HeldMediaStore", () => ({
    toggleCamera: mocks.toggleCamera,
    toggleMicrophone: mocks.toggleMicrophone,
}));

vi.mock("./MediaStore", () => ({
    silentStore: writable(false),
    cameraListStore: writable<MediaDeviceInfo[] | undefined>(undefined),
    microphoneListStore: writable<MediaDeviceInfo[] | undefined>(undefined),
}));

import { cameraListStore, microphoneListStore, silentStore } from "./MediaStore";
import { toggleMedia } from "./MediaToggleStore";

// The stores are read-only in MediaStore's types but plain writables in the mock above.
function set<T>(store: Readable<T>, value: T): void {
    (store as Writable<T>).set(value);
}

describe("toggleMedia", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        set(silentStore, false);
        set(cameraListStore, undefined);
        set(microphoneListStore, undefined);
    });

    it("toggles each device through HeldMediaStore and tracks it", () => {
        toggleMedia("camera");
        expect(mocks.toggleCamera).toHaveBeenCalledOnce();
        expect(mocks.trackAdminEvent).toHaveBeenCalledWith("media.camera.toggled");

        toggleMedia("microphone");
        expect(mocks.toggleMicrophone).toHaveBeenCalledOnce();
        expect(mocks.trackAdminEvent).toHaveBeenCalledWith("media.microphone.toggled");
    });

    it("does nothing in a silent zone", () => {
        set(silentStore, true);
        toggleMedia("camera");
        toggleMedia("microphone");
        expect(mocks.toggleCamera).not.toHaveBeenCalled();
        expect(mocks.toggleMicrophone).not.toHaveBeenCalled();
        expect(mocks.trackAdminEvent).not.toHaveBeenCalled();
    });

    it("does nothing without a device, but toggles before the device list is known", () => {
        set(cameraListStore, []);
        toggleMedia("camera");
        expect(mocks.toggleCamera).not.toHaveBeenCalled();

        set(microphoneListStore, undefined);
        toggleMedia("microphone");
        expect(mocks.toggleMicrophone).toHaveBeenCalledOnce();
    });
});
