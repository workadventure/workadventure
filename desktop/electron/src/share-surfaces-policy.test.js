import { expect, test } from "vitest";
import { companionAutoOpenDisplay, companionVisibleInShare, meetingBarDisplay } from "./share-surfaces-policy";

// One test per row of the rules table in share-surfaces-policy.js.
const macSharing = { canHideFromCapture: true, sharing: true, pointerDisplayId: 3 };

test("meeting bar: on the shared screen, under the pointer for a window, none without a share or on Linux", () => {
    expect(meetingBarDisplay({ ...macSharing, sharedDisplayId: 2 })).toBe(2);
    expect(meetingBarDisplay(macSharing)).toBe(3);
    expect(meetingBarDisplay({ ...macSharing, sharing: false })).toBeUndefined();
    expect(meetingBarDisplay({ ...macSharing, canHideFromCapture: false, sharedDisplayId: 2 })).toBeUndefined();
});

test("companion: opens by itself during a share only on another screen, never on Linux", () => {
    const base = { ...macSharing, identifyingScreens: false, displayIds: [1, 2, 3], sharedDisplayId: 1 };
    expect(companionAutoOpenDisplay({ ...base, sharing: false })).toBe(3);
    expect(companionAutoOpenDisplay(base)).toBe(3);
    expect(companionAutoOpenDisplay({ ...base, pointerDisplayId: 1 })).toBe(2);
    expect(companionAutoOpenDisplay({ ...base, displayIds: [1] })).toBeUndefined();
    expect(companionAutoOpenDisplay({ ...base, sharedDisplayId: undefined })).toBeUndefined();
    expect(companionAutoOpenDisplay({ ...base, canHideFromCapture: false })).toBeUndefined();
    // On Linux outside a share it still opens by itself.
    expect(companionAutoOpenDisplay({ ...base, canHideFromCapture: false, sharing: false })).toBe(3);
    // Opened by hand during a share on Linux: it warns it is visible in the share.
    expect(companionVisibleInShare(false, true)).toBe(true);
    expect(companionVisibleInShare(true, true)).toBe(false);
    expect(companionVisibleInShare(false, false)).toBe(false);
});

test("identify screens: nothing opens by itself", () => {
    expect(
        companionAutoOpenDisplay({ ...macSharing, sharing: false, identifyingScreens: true, displayIds: [1, 2, 3] })
    ).toBeUndefined();
});
