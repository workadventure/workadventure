import { beforeEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";

const persistedStates: boolean[] = [];

vi.mock("../Connection/LocalUserStore", () => ({
    localUserStore: {
        getRequestedMicrophoneState: () => false,
        setRequestedMicrophoneState: (state: boolean) => persistedStates.push(state),
    },
}));

const {
    createTemporaryUnmuteReleaseController,
    effectiveMicrophoneState,
    forceMuteMicrophone,
    requestedMicrophoneState,
    shouldIgnorePushToTalkKeyboardEvent,
    temporaryMicrophoneState,
} = await import("./MicrophoneSessionStore");

describe("MicrophoneSessionStore", () => {
    beforeEach(() => {
        persistedStates.length = 0;
        temporaryMicrophoneState.set(false);
        requestedMicrophoneState.disableMicrophone();
        persistedStates.length = 0;
    });

    it("exposes effective microphone state as persistent or temporary, and never persists the temporary one", () => {
        expect(get(effectiveMicrophoneState)).toBe(false);

        temporaryMicrophoneState.set(true);

        expect(get(requestedMicrophoneState)).toBe(false);
        expect(get(effectiveMicrophoneState)).toBe(true);
        expect(persistedStates).toEqual([]);

        requestedMicrophoneState.enableMicrophone();

        expect(get(effectiveMicrophoneState)).toBe(true);
        expect(persistedStates).toEqual([true]);
    });

    it("force mutes both persistent and temporary microphone state", () => {
        requestedMicrophoneState.enableMicrophone();
        temporaryMicrophoneState.set(true);
        persistedStates.length = 0;

        forceMuteMicrophone();

        expect(get(requestedMicrophoneState)).toBe(false);
        expect(get(temporaryMicrophoneState)).toBe(false);
        expect(get(effectiveMicrophoneState)).toBe(false);
        expect(persistedStates).toEqual([false]);
    });

    it("releases temporary unmute on blur, hidden document, and availability loss", () => {
        const pushToTalkAvailabilityStore = writable(true);
        const stopTemporaryUnmute = vi.fn();
        const controller = createTemporaryUnmuteReleaseController({
            pushToTalkAvailabilityStore,
            stopTemporaryUnmute,
        });

        window.dispatchEvent(new Event("blur"));
        expect(stopTemporaryUnmute).toHaveBeenCalledTimes(1);

        Object.defineProperty(document, "hidden", { configurable: true, value: true });
        document.dispatchEvent(new Event("visibilitychange"));
        expect(stopTemporaryUnmute).toHaveBeenCalledTimes(2);
        Object.defineProperty(document, "hidden", { configurable: true, value: false });

        pushToTalkAvailabilityStore.set(false);
        expect(stopTemporaryUnmute).toHaveBeenCalledTimes(3);

        controller.destroy();
        window.dispatchEvent(new Event("blur"));
        expect(stopTemporaryUnmute).toHaveBeenCalledTimes(3);
    });

    it("ignores push-to-talk keyboard events while typing", () => {
        const contentEditable = document.createElement("div");
        contentEditable.contentEditable = "true";

        expect(shouldIgnorePushToTalkKeyboardEvent(document.createElement("input"))).toBe(true);
        expect(shouldIgnorePushToTalkKeyboardEvent(document.createElement("textarea"))).toBe(true);
        expect(shouldIgnorePushToTalkKeyboardEvent(document.createElement("select"))).toBe(true);
        expect(shouldIgnorePushToTalkKeyboardEvent(contentEditable)).toBe(true);
        expect(shouldIgnorePushToTalkKeyboardEvent(document.createElement("button"))).toBe(false);
        expect(shouldIgnorePushToTalkKeyboardEvent(null)).toBe(false);
    });
});
