import { describe, expect, it, vi } from "vitest";
import { readable } from "svelte/store";
import { NativePictureInPictureClient, shouldOpenNativePictureInPicture } from "./NativePictureInPictureClient";

describe("shouldOpenNativePictureInPicture", () => {
    const base = {
        nativeAvailable: true,
        allowedByUser: true,
        inActiveConversation: true,
        userAwayFromApp: false,
        userManuallyOpened: false,
    };

    it("never opens when native PiP is not available", () => {
        expect(
            shouldOpenNativePictureInPicture({
                ...base,
                nativeAvailable: false,
                userManuallyOpened: true,
                userAwayFromApp: true,
            }),
        ).toBe(false);
    });

    it("never opens when the user disabled PiP", () => {
        expect(
            shouldOpenNativePictureInPicture({
                ...base,
                allowedByUser: false,
                userAwayFromApp: true,
            }),
        ).toBe(false);
    });

    it("never opens when nobody else is in the conversation", () => {
        expect(
            shouldOpenNativePictureInPicture({
                ...base,
                inActiveConversation: false,
                userAwayFromApp: true,
            }),
        ).toBe(false);
    });

    it("opens automatically when user is away AND someone is in the meeting", () => {
        expect(shouldOpenNativePictureInPicture({ ...base, userAwayFromApp: true })).toBe(true);
    });

    it("opens when user manually requested PiP even if focused", () => {
        expect(shouldOpenNativePictureInPicture({ ...base, userManuallyOpened: true })).toBe(true);
    });

    it("does not open on user request when nobody else is in the meeting", () => {
        expect(
            shouldOpenNativePictureInPicture({
                ...base,
                userManuallyOpened: true,
                inActiveConversation: false,
            }),
        ).toBe(false);
    });

    it("stays closed when user is focused and did not request PiP", () => {
        expect(shouldOpenNativePictureInPicture(base)).toBe(false);
    });
});

describe("NativePictureInPictureClient", () => {
    it("does not wire a session when stop() ran while the PiP window was opening", async () => {
        let resolveOpen: (opened: boolean) => void = () => {};
        const pip = {
            open: vi.fn(
                () =>
                    new Promise<boolean>((resolve) => {
                        resolveOpen = resolve;
                    }),
            ),
            close: vi.fn(() => Promise.resolve()),
        };
        const desktopWindow = window as unknown as { WAD?: unknown };
        desktopWindow.WAD = { desktop: true, pip };
        const RTCPeerConnectionSpy = vi.fn();
        vi.stubGlobal("RTCPeerConnection", RTCPeerConnectionSpy);

        const client = new NativePictureInPictureClient({
            streamables: readable(new Map()),
            selfBox: readable(undefined),
            deviceState: readable({
                micEnabled: false,
                cameraEnabled: false,
                screenSharing: false,
                canScreenShare: false,
                recording: false,
            }),
            commandHandlers: {
                toggleMic: () => {},
                toggleCamera: () => {},
                toggleScreenshare: () => {},
                pickScreenSource: () => {},
            },
        });

        const started = client.start();
        client.stop();
        resolveOpen(true);

        expect(await started).toBe(false);
        expect(client.isActive()).toBe(false);
        expect(RTCPeerConnectionSpy).not.toHaveBeenCalled();
        expect(pip.close).toHaveBeenCalled();
        delete desktopWindow.WAD;
        vi.unstubAllGlobals();
    });
});
