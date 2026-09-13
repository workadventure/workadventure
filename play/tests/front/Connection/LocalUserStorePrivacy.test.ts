// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { localUserStore } from "../../../src/front/Connection/LocalUserStore";

describe("microphone privacy settings", () => {
    beforeEach(() => {
        localStorage.clear();
        localUserStore.setDefaultCameraPrivacySettings(false);
        localUserStore.setDefaultMicrophonePrivacySettings(true);
    });

    it("should default microphone to true and camera to false when no env default is provided", () => {
        expect(localUserStore.getMicrophonePrivacySettings()).toBe(true);
        expect(localUserStore.getCameraPrivacySettings()).toBe(false);
    });

    it("should use the configured default when the user has no stored preference", () => {
        localUserStore.setDefaultCameraPrivacySettings(true);
        localUserStore.setDefaultMicrophonePrivacySettings(false);
        expect(localUserStore.getCameraPrivacySettings()).toBe(true);
        expect(localUserStore.getMicrophonePrivacySettings()).toBe(false);
    });

    it("should keep the user's own preference even if the default changes", () => {
        localUserStore.setMicrophonePrivacySettings(true);
        localUserStore.setDefaultMicrophonePrivacySettings(false);
        localUserStore.setCameraPrivacySettings(false);
        localUserStore.setDefaultCameraPrivacySettings(true);
        expect(localUserStore.getMicrophonePrivacySettings()).toBe(true);
        expect(localUserStore.getCameraPrivacySettings()).toBe(false);
    });

    it("should allow the user to opt back in after the default was applied", () => {
        localUserStore.setDefaultCameraPrivacySettings(false);
        localUserStore.setDefaultMicrophonePrivacySettings(false);
        expect(localUserStore.getCameraPrivacySettings()).toBe(false);
        expect(localUserStore.getMicrophonePrivacySettings()).toBe(false);
        localUserStore.setCameraPrivacySettings(true);
        localUserStore.setMicrophonePrivacySettings(true);
        expect(localUserStore.getCameraPrivacySettings()).toBe(true);
        expect(localUserStore.getMicrophonePrivacySettings()).toBe(true);
    });
});
