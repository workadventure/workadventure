import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import { mock } from "vitest-mock-extended";
import type { WorkAdventureDesktopWindowsApi } from "../../Interfaces/DesktopAppInterfaces";
vi.mock("../../Space/ScreenAnnotation/ScreenAnnotationManager", () => ({
    screenAnnotationManager: { localUserId: "me", clearAll: vi.fn() },
}));
const emitStop = vi.hoisted(() => vi.fn());
vi.mock("../../Space/ScreenAnnotation/PresenterEffectManager", () => ({
    presenterEffectManager: { emitStop, emitEffect: vi.fn() },
}));
vi.mock("../../Stores/ScreenSharingStore", () => {
    const sharing = writable(false);
    return {
        requestedScreenSharingState: {
            subscribe: sharing.subscribe,
            enableScreenSharing: () => sharing.set(true),
            disableScreenSharing: () => sharing.set(false),
        },
        activeScreenShareSourceStore: writable(undefined),
    };
});
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { localAnnotationTargetStore, screenAnnotationElementsStore } from "../../Stores/ScreenAnnotationStore";
import {
    presenterToolStore,
    presenterEffectsStore,
    setPresenterEffect,
    type ActivePresenterTool,
} from "../../Stores/PresenterEffectStore";
import { startSvelteAnnotations } from "./SvelteAnnotations";
let stop: (() => void) | undefined;
beforeEach(() => {
    vi.clearAllMocks();
    requestedScreenSharingState.disableScreenSharing();
    localAnnotationTargetStore.set(undefined);
    screenAnnotationElementsStore.set(new Map());
    presenterToolStore.set("none");
});
afterEach(() => {
    stop?.();
    stop = undefined;
});
describe("Svelte annotation window contract", () => {
    it("allows an older desktop without the optional annotation capability", () => {
        const windows = mock<WorkAdventureDesktopWindowsApi>({ setAnnotationState: undefined });
        expect(() => startSvelteAnnotations(windows)()).not.toThrow();
    });
    it("requests input capture only during explicit drawing and cleans up subscriptions", () => {
        const setState = vi.fn();
        const windows = mock<WorkAdventureDesktopWindowsApi>({ setAnnotationState: setState });
        stop = startSvelteAnnotations(windows);
        requestedScreenSharingState.enableScreenSharing();
        localAnnotationTargetStore.set("me");
        expect(setState).toHaveBeenLastCalledWith({ visible: true, interactive: true, trackCursor: false });
        localAnnotationTargetStore.set(undefined);
        expect(setState).toHaveBeenLastCalledWith({ visible: false, interactive: false, trackCursor: false });
        stop();
        stop = undefined;
        setState.mockClear();
        localAnnotationTargetStore.set("me");
        expect(setState).not.toHaveBeenCalled();
    });
    it.each(["laser", "spotlight", "loupe"] satisfies ActivePresenterTool[])(
        "stops %s when leaving annotation mode",
        (tool) => {
            const setState = vi.fn();
            stop = startSvelteAnnotations(mock<WorkAdventureDesktopWindowsApi>({ setAnnotationState: setState }));
            requestedScreenSharingState.enableScreenSharing();
            localAnnotationTargetStore.set("me");
            presenterToolStore.set(tool);
            setPresenterEffect("me", { tool, x: 0.5, y: 0.5, scale: 0 });
            localAnnotationTargetStore.set(undefined);
            expect(get(presenterToolStore)).toBe("none");
            expect(get(presenterEffectsStore).has("me")).toBe(false);
            expect(emitStop).toHaveBeenCalledWith("me");
            expect(setState).toHaveBeenLastCalledWith({ visible: false, interactive: false, trackCursor: false });
        },
    );
    it("stops a presenter effect when screen sharing ends", () => {
        stop = startSvelteAnnotations(mock<WorkAdventureDesktopWindowsApi>());
        requestedScreenSharingState.enableScreenSharing();
        presenterToolStore.set("laser");
        requestedScreenSharingState.disableScreenSharing();
        expect(emitStop).toHaveBeenCalledWith("me");
    });
});
