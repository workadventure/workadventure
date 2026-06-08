import { AvailabilityStatus } from "@workadventure/messages";
import { describe, expect, it } from "vitest";
import { LOCAL_CAMERA_SMALL_SCREEN_WIDTH, shouldDisplayLocalCameraPeer } from "./StreamableCollectionRules";

const defaultOptions = {
    hasCameraDevice: true,
    isCameraEnergySaving: false,
    isSilent: false,
    requestedCameraState: true,
    windowWidth: 1024,
    isMobile: false,
    isInActiveConversation: false,
    isListener: false,
    listenerSharingCamera: false,
    availabilityStatus: AvailabilityStatus.ONLINE,
};

describe("shouldDisplayLocalCameraPeer", () => {
    it("hides the local camera on mobile while outside a conversation", () => {
        expect(
            shouldDisplayLocalCameraPeer({
                ...defaultOptions,
                isMobile: true,
            }),
        ).toBe(false);
    });

    it("hides the local camera below the small screen width while outside a conversation", () => {
        expect(
            shouldDisplayLocalCameraPeer({
                ...defaultOptions,
                windowWidth: LOCAL_CAMERA_SMALL_SCREEN_WIDTH - 1,
            }),
        ).toBe(false);
    });

    it("keeps the local camera peer in a conversation when the camera is disabled", () => {
        expect(
            shouldDisplayLocalCameraPeer({
                ...defaultOptions,
                requestedCameraState: false,
                isInActiveConversation: true,
            }),
        ).toBe(true);
    });

    it("hides the local camera peer outside a conversation when the camera is disabled", () => {
        expect(
            shouldDisplayLocalCameraPeer({
                ...defaultOptions,
                requestedCameraState: false,
            }),
        ).toBe(false);
    });
});
