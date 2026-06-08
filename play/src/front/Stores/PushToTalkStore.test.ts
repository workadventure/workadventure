import { describe, expect, it } from "vitest";
import { AvailabilityStatus } from "@workadventure/messages";
import {
    canStartPushToTalk,
    shouldKeepMegaphoneStreaming,
    shouldEnableAudioConstraint,
    shouldIgnorePushToTalkKeyboardEvent,
    shouldShowMicrophoneAsEnabled,
} from "./PushToTalkStore";

describe("PushToTalkStore", () => {
    it("allows push-to-talk only when the user is muted in a WorkAdventure-controlled meeting", () => {
        expect(
            canStartPushToTalk({
                requestedMicrophoneState: false,
                isInConversationBubble: true,
                isInLivekit: false,
                isSpeaker: false,
            }),
        ).toBe(true);

        expect(
            canStartPushToTalk({
                requestedMicrophoneState: false,
                isInConversationBubble: false,
                isInLivekit: true,
                isSpeaker: false,
            }),
        ).toBe(true);

        expect(
            canStartPushToTalk({
                requestedMicrophoneState: false,
                isInConversationBubble: false,
                isInLivekit: false,
                isSpeaker: true,
            }),
        ).toBe(true);

        expect(
            canStartPushToTalk({
                requestedMicrophoneState: false,
                isInConversationBubble: false,
                isInLivekit: false,
                isSpeaker: false,
            }),
        ).toBe(false);

        expect(
            canStartPushToTalk({
                requestedMicrophoneState: true,
                isInConversationBubble: true,
                isInLivekit: false,
                isSpeaker: true,
            }),
        ).toBe(false);
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

        expect(
            shouldEnableAudioConstraint({
                requestedMicrophoneState: false,
                temporaryMicrophoneState: true,
                myMicrophone: true,
                isInExternalService: false,
                shouldDisableMicrophoneForPrivacy: true,
                isEnergySaving: false,
                availabilityStatus: AvailabilityStatus.ONLINE,
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

    it("shows the microphone as enabled while push-to-talk is active", () => {
        expect(
            shouldShowMicrophoneAsEnabled({
                requestedMicrophoneState: false,
                temporaryMicrophoneState: true,
            }),
        ).toBe(true);

        expect(
            shouldShowMicrophoneAsEnabled({
                requestedMicrophoneState: false,
                temporaryMicrophoneState: false,
            }),
        ).toBe(false);
    });

    it("keeps megaphone streaming while push-to-talk temporarily enables the microphone", () => {
        expect(
            shouldKeepMegaphoneStreaming({
                requestedCameraState: false,
                requestedMicrophoneState: false,
                temporaryMicrophoneState: true,
                requestedScreenSharingState: false,
            }),
        ).toBe(true);

        expect(
            shouldKeepMegaphoneStreaming({
                requestedCameraState: false,
                requestedMicrophoneState: false,
                temporaryMicrophoneState: false,
                requestedScreenSharingState: false,
            }),
        ).toBe(false);
    });
});
