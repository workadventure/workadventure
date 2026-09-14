// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { localUserStore } from "../../../src/front/Connection/LocalUserStore";

describe("privacy settings", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("should return the default value when the user has no stored preference", () => {
        expect(localUserStore.getCameraPrivacySettings(true)).toBe(true);
        expect(localUserStore.getMicrophonePrivacySettings(false)).toBe(false);
    });

    it("should return the user's stored preference over the default value", () => {
        localUserStore.setCameraPrivacySettings(false);
        localUserStore.setMicrophonePrivacySettings(true);
        expect(localUserStore.getCameraPrivacySettings(true)).toBe(false);
        expect(localUserStore.getMicrophonePrivacySettings(false)).toBe(true);
    });
});
