import { describe, expect, it } from "vitest";

import { deviceHelpContext, isPermissionDenied } from "./MediaStatusStore";

// Chromium answers "denied" when the user blocks a device, so its permission state can be trusted.
const CHROMIUM = true;
// Safari always answers "prompt", even after a denial, and Firefox rejects the query (leaving the state null).
const SAFARI_OR_FIREFOX = false;

describe("isPermissionDenied", () => {
    it("trusts the Permissions API when it reports a denial", () => {
        expect(isPermissionDenied("denied", null, CHROMIUM)).toBe(true);
    });

    it("trusts the Permissions API when it reports a grant", () => {
        expect(isPermissionDenied("granted", "permission_denied", CHROMIUM)).toBe(false);
        expect(isPermissionDenied("granted", "permission_denied", SAFARI_OR_FIREFOX)).toBe(false);
    });

    it("does not report a denial on Chromium when the prompt was merely dismissed", () => {
        // Chromium rejects getUserMedia with NotAllowedError when the user closes the prompt without choosing,
        // while the permission state stays "prompt". That is not a denial.
        expect(isPermissionDenied("prompt", "permission_denied", CHROMIUM)).toBe(false);
    });

    it("does not report a denial on Chromium while the permission query is still in flight", () => {
        expect(isPermissionDenied(null, "permission_denied", CHROMIUM)).toBe(false);
    });

    it('reports a denial on Safari, which answers "prompt" even once the user has denied', () => {
        expect(isPermissionDenied("prompt", "permission_denied", SAFARI_OR_FIREFOX)).toBe(true);
    });

    it("reports a denial on Firefox, which leaves the state unanswered", () => {
        expect(isPermissionDenied(null, "permission_denied", SAFARI_OR_FIREFOX)).toBe(true);
    });

    it("does not confuse a missing device with a denial", () => {
        expect(isPermissionDenied("prompt", "no_device", SAFARI_OR_FIREFOX)).toBe(false);
    });

    it("does not report a denial without a media access failure", () => {
        expect(isPermissionDenied("prompt", null, SAFARI_OR_FIREFOX)).toBe(false);
    });
});

describe("deviceHelpContext", () => {
    const ONE_DEVICE = [{}];

    it("explains a denial first", () => {
        expect(deviceHelpContext(true, "no_device", [], false)).toBe("permission");
    });

    it("ignores a permission failure the denial rules do not confirm", () => {
        // On Chromium, a dismissed prompt leaves a permission_denied failure without being a denial.
        expect(deviceHelpContext(false, "permission_denied", ONE_DEVICE, false)).toBe(null);
    });

    it("reports a missing device from the device list", () => {
        expect(deviceHelpContext(false, null, [], false)).toBe("no_device");
    });

    it("drops a missing-device failure once a device is listed", () => {
        expect(deviceHelpContext(false, "no_device", ONE_DEVICE, false)).toBe(null);
    });

    it("relies on the failure while the device list is not known yet", () => {
        expect(deviceHelpContext(false, "no_device", undefined, true)).toBe("no_device");
        expect(deviceHelpContext(false, null, undefined, true)).toBe(null);
    });
});
