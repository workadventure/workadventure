import { AvailabilityStatus } from "@workadventure/messages";
import type { Readable, Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    trackAdminEvent: vi.fn(),
}));

vi.mock("../Administration/AnalyticsClient", () => ({
    analyticsClient: { trackAdminEvent: mocks.trackAdminEvent },
}));

vi.mock("./MediaStore", () => {
    const requestedCameraState = Object.assign(writable(false), {
        enableWebcam: vi.fn(),
        disableWebcam: vi.fn(),
    });
    const requestedMicrophoneState = Object.assign(writable(false), {
        enableMicrophone: vi.fn(),
        disableMicrophone: vi.fn(),
    });
    return {
        availabilityStatusStore: writable(AvailabilityStatus.ONLINE),
        silentStore: writable(false),
        cameraListStore: writable<MediaDeviceInfo[] | undefined>(undefined),
        microphoneListStore: writable<MediaDeviceInfo[] | undefined>(undefined),
        requestedCameraState,
        requestedMicrophoneState,
    };
});

import {
    availabilityStatusStore,
    cameraListStore,
    microphoneListStore,
    requestedCameraState,
    requestedMicrophoneState,
    silentStore,
} from "./MediaStore";
import { createMediaToggleAvailableStore, isMediaToggleAvailable, toggleMedia } from "./MediaToggleStore";

const device = {} as MediaDeviceInfo;

// The stores are read-only in MediaStore's types but plain writables in the mock above.
function set<T>(store: Readable<T>, value: T): void {
    (store as Writable<T>).set(value);
}

describe("MediaToggleStore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        set(availabilityStatusStore, AvailabilityStatus.ONLINE);
        set(silentStore, false);
        set(cameraListStore, undefined);
        set(microphoneListStore, undefined);
        set(requestedCameraState, false);
        set(requestedMicrophoneState, false);
    });

    it("allows toggling while the device list is still unknown or has a device", () => {
        expect(isMediaToggleAvailable("camera")).toBe(true);
        set(cameraListStore, [device]);
        expect(isMediaToggleAvailable("camera")).toBe(true);
    });

    it("blocks toggling when no device is available, only for that media", () => {
        set(cameraListStore, []);
        expect(isMediaToggleAvailable("camera")).toBe(false);
        expect(isMediaToggleAvailable("microphone")).toBe(true);
    });

    it("blocks toggling in a silent zone", () => {
        set(silentStore, true);
        expect(isMediaToggleAvailable("microphone")).toBe(false);
    });

    it.each([
        AvailabilityStatus.BUSY,
        AvailabilityStatus.AWAY,
        AvailabilityStatus.BACK_IN_A_MOMENT,
        AvailabilityStatus.SOUND_BLOCKED,
        AvailabilityStatus.DO_NOT_DISTURB,
    ])("blocks toggling with the status %s", (status) => {
        set(availabilityStatusStore, status);
        expect(isMediaToggleAvailable("camera")).toBe(false);
    });

    it("keeps the store in sync with the synchronous check", () => {
        const available = createMediaToggleAvailableStore("microphone");
        expect(get(available)).toBe(true);
        set(microphoneListStore, []);
        expect(get(available)).toBe(false);
    });

    it("turns the camera on, then off, and tracks each toggle", () => {
        toggleMedia("camera");
        expect(requestedCameraState.enableWebcam).toHaveBeenCalledOnce();
        set(requestedCameraState, true);
        toggleMedia("camera");
        expect(requestedCameraState.disableWebcam).toHaveBeenCalledOnce();
        expect(mocks.trackAdminEvent).toHaveBeenCalledTimes(2);
        expect(mocks.trackAdminEvent).toHaveBeenCalledWith("media.camera.toggled");
    });

    it("turns the microphone on, then off", () => {
        toggleMedia("microphone");
        expect(requestedMicrophoneState.enableMicrophone).toHaveBeenCalledOnce();
        set(requestedMicrophoneState, true);
        toggleMedia("microphone");
        expect(requestedMicrophoneState.disableMicrophone).toHaveBeenCalledOnce();
    });

    it("does nothing and tracks nothing when toggling is blocked", () => {
        set(silentStore, true);
        toggleMedia("microphone");
        expect(requestedMicrophoneState.enableMicrophone).not.toHaveBeenCalled();
        expect(mocks.trackAdminEvent).not.toHaveBeenCalled();
    });
});
