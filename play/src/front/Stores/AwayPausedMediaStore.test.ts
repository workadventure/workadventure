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
        requestedStatusStore: writable(null),
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

import { requestedCameraState, requestedMicrophoneState, requestedStatusStore } from "./MediaStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { awayPausedMediaStore, comeBackWith } from "./AwayPausedMediaStore";

const away = privacyShutdownStore as unknown as { set: (value: boolean) => void };
const status = requestedStatusStore as unknown as Writable<unknown>;

describe("awayPausedMediaStore", () => {
    beforeEach(() => {
        settings.keepCamera = false;
        settings.keepMicrophone = false;
        status.set(null);
        requestedCameraState.enableWebcam();
        requestedMicrophoneState.enableMicrophone();
        away.set(true);
    });

    it("pauses each device the away settings hold, and none the user turned off", () => {
        expect(get(awayPausedMediaStore)).toEqual({ camera: true, microphone: true });

        settings.keepMicrophone = true;
        away.set(false);
        away.set(true);
        expect(get(awayPausedMediaStore)).toEqual({ camera: true, microphone: false });

        requestedCameraState.disableWebcam();
        expect(get(awayPausedMediaStore)).toEqual({ camera: false, microphone: false });
    });

    it("pauses nothing outside away mode, or under a status that turns media off anyway", () => {
        away.set(false);
        expect(get(awayPausedMediaStore)).toEqual({ camera: false, microphone: false });

        away.set(true);
        status.set(AvailabilityStatus.DO_NOT_DISTURB);
        expect(get(awayPausedMediaStore)).toEqual({ camera: false, microphone: false });
    });

    it("comes back with only the clicked device; the other paused one is turned off", () => {
        comeBackWith("camera");
        expect(get(privacyShutdownStore)).toBe(false);
        expect(get(requestedCameraState)).toBe(true);
        expect(get(requestedMicrophoneState)).toBe(false);
    });

    it("leaves alone a device away mode does not hold", () => {
        settings.keepCamera = true;
        away.set(false);
        away.set(true);
        comeBackWith("microphone");
        expect(get(requestedCameraState)).toBe(true);
        expect(get(requestedMicrophoneState)).toBe(true);
    });
});
