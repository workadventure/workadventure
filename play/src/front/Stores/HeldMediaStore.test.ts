import { describe, expect, it, vi, beforeEach } from "vitest";
import { AvailabilityStatus } from "@workadventure/messages";
import { get, type Writable } from "svelte/store";

const settings = vi.hoisted(() => ({ keepCamera: false, keepMicrophone: false }));

vi.mock("../Connection/LocalUserStore", () => ({
    localUserStore: {
        getCameraPrivacySettings: () => settings.keepCamera,
        getMicrophonePrivacySettings: () => settings.keepMicrophone,
    },
}));
vi.mock("../Connection/Room", () => ({
    Room: { DEFAULT_CAMERA_PRIVACY_SETTINGS: false, DEFAULT_MICROPHONE_PRIVACY_SETTINGS: false },
}));
vi.mock("./CurrentRoomStore", async () => {
    const { writable } = await import("svelte/store");
    return { currentRoomStore: writable(undefined) };
});
vi.mock("./MediaStore", async () => {
    const { writable } = await import("svelte/store");
    const device = () => {
        const store = writable(true);
        return { ...store, enable: () => store.set(true), disable: () => store.set(false) };
    };
    const camera = device();
    const microphone = device();
    return {
        availabilityStatusStore: writable(0),
        requestedCameraState: { ...camera, enableWebcam: camera.enable, disableWebcam: camera.disable },
        requestedMicrophoneState: {
            ...microphone,
            enableMicrophone: microphone.enable,
            disableMicrophone: microphone.disable,
        },
    };
});
vi.mock("./PrivacyShutdownStore", async () => {
    const { writable } = await import("svelte/store");
    const store = writable(true);
    return { privacyShutdownStore: { subscribe: store.subscribe, set: store.set, comeBack: () => store.set(false) } };
});

import { availabilityStatusStore, requestedCameraState, requestedMicrophoneState } from "./MediaStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { heldMediaStore, comeBackWith } from "./HeldMediaStore";

const privacyShutdown = privacyShutdownStore as unknown as { set: (value: boolean) => void };
const availability = availabilityStatusStore as unknown as Writable<AvailabilityStatus>;

/** Away mode, as the app sets it: the privacy shutdown, which the availability reports unless a status wins. */
function goAway(status = AvailabilityStatus.AWAY): void {
    privacyShutdown.set(true);
    availability.set(status);
}

describe("heldMediaStore", () => {
    beforeEach(() => {
        settings.keepCamera = false;
        settings.keepMicrophone = false;
        requestedCameraState.enableWebcam();
        requestedMicrophoneState.enableMicrophone();
        goAway();
    });

    it("in away mode, holds each device its setting does not keep, and none the user turned off", () => {
        expect(get(heldMediaStore)).toEqual({ camera: true, microphone: true, status: AvailabilityStatus.AWAY });

        settings.keepMicrophone = true;
        goAway(AvailabilityStatus.ONLINE);
        goAway();
        expect(get(heldMediaStore)).toEqual({ camera: true, microphone: false, status: AvailabilityStatus.AWAY });

        requestedCameraState.disableWebcam();
        expect(get(heldMediaStore)).toEqual({ camera: false, microphone: false, status: AvailabilityStatus.AWAY });
    });

    it("names away mode even when the availability shows a meeting", () => {
        goAway(AvailabilityStatus.LIVEKIT);
        expect(get(heldMediaStore)).toEqual({ camera: true, microphone: true, status: AvailabilityStatus.AWAY });
    });

    it("under a status like do not disturb, holds both devices whatever the away settings", () => {
        settings.keepCamera = true;
        settings.keepMicrophone = true;
        goAway(AvailabilityStatus.DO_NOT_DISTURB);
        expect(get(heldMediaStore)).toEqual({
            camera: true,
            microphone: true,
            status: AvailabilityStatus.DO_NOT_DISTURB,
        });

        requestedMicrophoneState.disableMicrophone();
        expect(get(heldMediaStore).microphone).toBe(false);
    });

    it("holds nothing when the user is online", () => {
        privacyShutdown.set(false);
        availability.set(AvailabilityStatus.ONLINE);
        expect(get(heldMediaStore)).toEqual({ camera: false, microphone: false, status: AvailabilityStatus.ONLINE });
    });

    it("comes back with only the clicked device; the other held one is turned off", () => {
        comeBackWith("camera");
        expect(get(privacyShutdownStore)).toBe(false);
        expect(get(requestedCameraState)).toBe(true);
        expect(get(requestedMicrophoneState)).toBe(false);
    });

    it("turns on the clicked device even if the user had turned it off", () => {
        requestedCameraState.disableWebcam();
        requestedMicrophoneState.disableMicrophone();
        comeBackWith("camera");
        expect(get(privacyShutdownStore)).toBe(false);
        expect(get(requestedCameraState)).toBe(true);
        expect(get(requestedMicrophoneState)).toBe(false);
    });

    it("leaves alone a device away mode does not hold", () => {
        settings.keepCamera = true;
        goAway(AvailabilityStatus.ONLINE);
        goAway();
        comeBackWith("microphone");
        expect(get(requestedCameraState)).toBe(true);
        expect(get(requestedMicrophoneState)).toBe(true);
    });
});
