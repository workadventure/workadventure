import { describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import {
    canStartPushToTalk,
    createMicrophoneSessionStore,
    createPushToTalkAvailabilityStore,
    createTemporaryUnmuteReleaseController,
    shouldEnableAudioConstraint,
    shouldIgnorePushToTalkKeyboardEvent,
    shouldKeepMegaphoneStreaming,
} from "./MicrophoneSessionStore";

describe("MicrophoneSessionStore", () => {
    it("exposes effective microphone state as persistent or temporary", () => {
        const persistedStates: boolean[] = [];
        const { microphoneSession, requestedMicrophoneState, temporaryMicrophoneState, effectiveMicrophoneState } =
            createMicrophoneSessionStore({
                initialPersistentMicrophoneState: false,
                persistPersistentMicrophoneState: (state) => persistedStates.push(state),
            });

        expect(get(requestedMicrophoneState)).toBe(false);
        expect(get(temporaryMicrophoneState)).toBe(false);
        expect(get(effectiveMicrophoneState)).toBe(false);

        microphoneSession.startTemporaryUnmute();

        expect(get(requestedMicrophoneState)).toBe(false);
        expect(get(temporaryMicrophoneState)).toBe(true);
        expect(get(effectiveMicrophoneState)).toBe(true);
        expect(persistedStates).toEqual([]);

        microphoneSession.enablePersistentMicrophone();

        expect(get(requestedMicrophoneState)).toBe(true);
        expect(get(temporaryMicrophoneState)).toBe(true);
        expect(get(effectiveMicrophoneState)).toBe(true);
        expect(persistedStates).toEqual([true]);
    });

    it("force mutes both persistent and temporary microphone state", () => {
        const persistedStates: boolean[] = [];
        const { microphoneSession, requestedMicrophoneState, temporaryMicrophoneState, effectiveMicrophoneState } =
            createMicrophoneSessionStore({
                initialPersistentMicrophoneState: true,
                persistPersistentMicrophoneState: (state) => persistedStates.push(state),
            });

        microphoneSession.startTemporaryUnmute();
        expect(get(effectiveMicrophoneState)).toBe(true);

        microphoneSession.forceMuteMicrophone();

        expect(get(requestedMicrophoneState)).toBe(false);
        expect(get(temporaryMicrophoneState)).toBe(false);
        expect(get(effectiveMicrophoneState)).toBe(false);
        expect(persistedStates).toEqual([false]);
    });

    it("allows push-to-talk only when muted inside a WorkAdventure-controlled meeting context", () => {
        const requestedMicrophoneState = writable(false);
        const currentPlayerGroupIdStore = writable<string | undefined>(undefined);
        const inLivekitStore = writable(false);
        const isSpeakerStore = writable(false);
        const availabilityStore = createPushToTalkAvailabilityStore({
            requestedMicrophoneState,
            currentPlayerGroupIdStore,
            inLivekitStore,
            isSpeakerStore,
        });

        expect(get(availabilityStore)).toBe(false);

        isSpeakerStore.set(true);
        expect(get(availabilityStore)).toBe(true);

        requestedMicrophoneState.set(true);
        expect(get(availabilityStore)).toBe(false);

        requestedMicrophoneState.set(false);
        isSpeakerStore.set(false);
        inLivekitStore.set(true);
        expect(get(availabilityStore)).toBe(true);

        inLivekitStore.set(false);
        currentPlayerGroupIdStore.set("group-id");
        expect(get(availabilityStore)).toBe(true);
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

        Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
        expect(stopTemporaryUnmute).toHaveBeenCalledTimes(2);
        Object.defineProperty(document, "hidden", {
            configurable: true,
            value: false,
        });

        pushToTalkAvailabilityStore.set(false);
        expect(stopTemporaryUnmute).toHaveBeenCalledTimes(3);

        controller.destroy();
        window.dispatchEvent(new Event("blur"));
        expect(stopTemporaryUnmute).toHaveBeenCalledTimes(3);
    });

    it("keeps status and privacy blockers stronger than temporary unmute", () => {
        expect(
            shouldEnableAudioConstraint({
                requestedMicrophoneState: false,
                temporaryMicrophoneState: true,
                myMicrophone: true,
                isInExternalService: false,
                shouldDisableMicrophoneForPrivacy: false,
                isEnergySaving: false,
                availabilityStatus: AvailabilityStatus.ONLINE,
            }),
        ).toBe(true);

        expect(
            shouldEnableAudioConstraint({
                requestedMicrophoneState: false,
                temporaryMicrophoneState: true,
                myMicrophone: true,
                isInExternalService: false,
                shouldDisableMicrophoneForPrivacy: false,
                isEnergySaving: false,
                availabilityStatus: AvailabilityStatus.BUSY,
            }),
        ).toBe(false);
    });

    it("keeps megaphone streaming while push-to-talk temporarily enables the microphone", () => {
        expect(
            shouldKeepMegaphoneStreaming({
                requestedCameraState: false,
                effectiveMicrophoneState: true,
                requestedScreenSharingState: false,
            }),
        ).toBe(true);

        expect(
            shouldKeepMegaphoneStreaming({
                requestedCameraState: false,
                effectiveMicrophoneState: false,
                requestedScreenSharingState: false,
            }),
        ).toBe(false);
    });

    it("ignores push-to-talk keyboard events while typing", () => {
        const input = document.createElement("input");
        const textarea = document.createElement("textarea");
        const contentEditable = document.createElement("div");
        const button = document.createElement("button");
        contentEditable.contentEditable = "true";

        expect(shouldIgnorePushToTalkKeyboardEvent(input)).toBe(true);
        expect(shouldIgnorePushToTalkKeyboardEvent(textarea)).toBe(true);
        expect(shouldIgnorePushToTalkKeyboardEvent(contentEditable)).toBe(true);
        expect(shouldIgnorePushToTalkKeyboardEvent(button)).toBe(false);
        expect(shouldIgnorePushToTalkKeyboardEvent(null)).toBe(false);
    });

    it("keeps the pure push-to-talk rule explicit for non-store callers", () => {
        expect(
            canStartPushToTalk({
                requestedMicrophoneState: false,
                isInConversationBubble: false,
                isInLivekit: false,
                isSpeaker: true,
            }),
        ).toBe(true);
    });
});
