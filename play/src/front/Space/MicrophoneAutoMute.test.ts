import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilterType } from "@workadventure/messages";
import { requestedMicrophoneState } from "../Stores/MediaStore";
import { toastStore } from "../Stores/ToastStoreSingleton";
import {
    countActiveMicrophones,
    evaluateMicrophoneAutoMute,
    restoreMicrophoneAutoMuteOnLeave,
    shouldAutoMute,
} from "./MicrophoneAutoMute";
import type { SpaceInterface, SpaceUserExtended } from "./SpaceInterface";

// vi.mock calls are hoisted above the imports above by Vitest, so the mocks apply before the module
// under test is loaded. The environment limit is fixed to 6; scenarios vary the active-microphone count.
vi.mock("../Enum/EnvironmentVariable", () => ({ MAX_SPEAKERS_BEFORE_AUTOMUTE: 6 }));

// A hand-rolled store that honours the Svelte store contract (subscribe fires synchronously with the
// current value, so `get()` works) and exposes spies for the enable/disable actions.
vi.mock("../Stores/MediaStore", () => {
    let value = true;
    const subscribers = new Set<(v: boolean) => void>();
    const notify = () => subscribers.forEach((s) => s(value));
    return {
        requestedMicrophoneState: {
            subscribe(run: (v: boolean) => void) {
                run(value);
                subscribers.add(run);
                return () => subscribers.delete(run);
            },
            enableMicrophone: vi.fn(() => {
                value = true;
                notify();
            }),
            disableMicrophone: vi.fn(() => {
                value = false;
                notify();
            }),
            __setValue(v: boolean) {
                value = v;
                notify();
            },
        },
    };
});

vi.mock("../Stores/ToastStoreSingleton", () => ({ toastStore: { addToast: vi.fn(), removeToast: vi.fn() } }));
vi.mock("../Components/Toasts/MicrophoneAutoMuteToast.svelte", () => ({ default: {} }));

const mic = requestedMicrophoneState as unknown as {
    enableMicrophone: (() => void) & { mockClear: () => void };
    disableMicrophone: (() => void) & { mockClear: () => void };
    __setValue: (v: boolean) => void;
};
const addToast = toastStore.addToast as unknown as ((...args: unknown[]) => void) & {
    mockClear: () => void;
    mock: { calls: unknown[][] };
};
const removeToast = toastStore.removeToast as unknown as ((...args: unknown[]) => void) & {
    mockClear: () => void;
    mock: { calls: unknown[][] };
};

function user(spaceUserId: string, microphoneState: boolean, megaphoneState = false): Readonly<SpaceUserExtended> {
    return { spaceUserId, microphoneState, megaphoneState } as unknown as SpaceUserExtended;
}

// Each space is a distinct object so it is a distinct WeakMap key (no state leaks between tests).
let spaceCounter = 0;
function makeSpace(isVideoSpace = true): SpaceInterface {
    return { mySpaceUserId: `me-${spaceCounter++}`, isVideoSpace: () => isVideoSpace } as unknown as SpaceInterface;
}

beforeEach(() => {
    mic.__setValue(true);
    mic.enableMicrophone.mockClear();
    mic.disableMicrophone.mockClear();
    addToast.mockClear();
    removeToast.mockClear();
});

describe("countActiveMicrophones", () => {
    it("counts other users with their microphone on and excludes the local user (ALL_USERS space)", () => {
        const users = new Map(
            [user("me", true), user("a", true), user("b", false), user("c", true)].map((u) => [u.spaceUserId, u]),
        );
        expect(countActiveMicrophones(users, "me", FilterType.ALL_USERS)).toBe(2);
    });

    it("counts only on-stage speakers (megaphoneState) in a megaphone / podium space", () => {
        // A listener with their mic on (megaphoneState false) does not broadcast to the megaphone space.
        const users = new Map(
            [
                user("me", true, true),
                user("speaker", true, true),
                user("listener-mic-on", true, false),
                user("speaker-muted", false, true),
            ].map((u) => [u.spaceUserId, u]),
        );
        expect(countActiveMicrophones(users, "me", FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK)).toBe(1);
    });
});

describe("shouldAutoMute", () => {
    it("mutes when at or above the limit and the mic is on", () => {
        expect(shouldAutoMute(6, true, 6)).toBe(true);
        expect(shouldAutoMute(7, true, 6)).toBe(true);
    });
    it("does not mute below the limit", () => {
        expect(shouldAutoMute(5, true, 6)).toBe(false);
    });
    it("does not mute when the mic is already off", () => {
        expect(shouldAutoMute(10, false, 6)).toBe(false);
    });
    it("is disabled when the limit is 0 or negative", () => {
        expect(shouldAutoMute(50, true, 0)).toBe(false);
        expect(shouldAutoMute(50, true, -1)).toBe(false);
    });
});

describe("evaluateMicrophoneAutoMute", () => {
    it("mutes the local microphone and shows a toast when the space is over the limit", () => {
        evaluateMicrophoneAutoMute(makeSpace(), 6);

        expect(mic.disableMicrophone).toHaveBeenCalledTimes(1);
        expect(addToast).toHaveBeenCalledTimes(1);
    });

    it("does not re-mute a space it already handled (join then go-live on a podium)", () => {
        const space = makeSpace();
        evaluateMicrophoneAutoMute(space, 6);
        // Simulate a second evaluation point for the same space (e.g. startStreaming).
        evaluateMicrophoneAutoMute(space, 6);

        expect(mic.disableMicrophone).toHaveBeenCalledTimes(1);
        expect(addToast).toHaveBeenCalledTimes(1);
    });

    it("does nothing when the space is under the limit", () => {
        evaluateMicrophoneAutoMute(makeSpace(), 5);

        expect(mic.disableMicrophone).not.toHaveBeenCalled();
        expect(addToast).not.toHaveBeenCalled();
    });

    it("does nothing for a non-communication space (isVideoSpace() === false, e.g. the world space)", () => {
        // A presence-only space (world space) must never trigger auto-mute even when far over the limit.
        evaluateMicrophoneAutoMute(makeSpace(false), 10);

        expect(mic.disableMicrophone).not.toHaveBeenCalled();
        expect(addToast).not.toHaveBeenCalled();
    });

    it("does nothing when the local microphone is already off", () => {
        mic.__setValue(false);
        evaluateMicrophoneAutoMute(makeSpace(), 10);

        expect(mic.disableMicrophone).not.toHaveBeenCalled();
    });
});

describe("restoreMicrophoneAutoMuteOnLeave", () => {
    it("restores the previous (on) microphone state when the user never touched the button", () => {
        const space = makeSpace();
        evaluateMicrophoneAutoMute(space, 6);
        expect(mic.disableMicrophone).toHaveBeenCalledTimes(1);

        restoreMicrophoneAutoMuteOnLeave(space);
        expect(mic.enableMicrophone).toHaveBeenCalledTimes(1);
    });

    it("dismisses the warning toast when the user leaves the space", () => {
        const space = makeSpace();
        evaluateMicrophoneAutoMute(space, 6);
        // The toast was added with a generated id (3rd argument of addToast).
        const toastUuid = addToast.mock.calls[0][2];

        restoreMicrophoneAutoMuteOnLeave(space);

        expect(removeToast).toHaveBeenCalledTimes(1);
        expect(removeToast).toHaveBeenCalledWith(toastUuid);
    });

    it("does not restore when the user manually toggled the microphone during the meeting", () => {
        const space = makeSpace();
        evaluateMicrophoneAutoMute(space, 6);

        // User manually turns the microphone back on.
        mic.enableMicrophone();
        expect(mic.enableMicrophone).toHaveBeenCalledTimes(1);

        restoreMicrophoneAutoMuteOnLeave(space);
        // No extra enable call from the restore logic.
        expect(mic.enableMicrophone).toHaveBeenCalledTimes(1);
    });

    it("does nothing for a space we never auto-muted", () => {
        restoreMicrophoneAutoMuteOnLeave(makeSpace());
        expect(mic.enableMicrophone).not.toHaveBeenCalled();
    });
});
