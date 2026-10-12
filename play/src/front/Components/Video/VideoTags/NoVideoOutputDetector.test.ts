import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readable } from "svelte/store";
import { NoVideoOutputDetector } from "./NoVideoOutputDetector";

function fakeVideoElement() {
    let frameCallback: (() => void) | undefined;
    const element = {
        requestVideoFrameCallback: vi.fn((callback: () => void) => {
            frameCallback = callback;
            return 1;
        }),
        cancelVideoFrameCallback: vi.fn(),
    };
    return { element: element as unknown as HTMLVideoElement, renderFrame: () => frameCallback?.() };
}

describe("NoVideoOutputDetector", () => {
    let visibility: DocumentVisibilityState = "visible";

    beforeEach(() => {
        vi.useFakeTimers();
        visibility = "visible";
        vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function setVisibility(state: DocumentVisibilityState) {
        visibility = state;
        document.dispatchEvent(new Event("visibilitychange"));
    }

    it("reports a missing video when no frame shows within 5 seconds", () => {
        const { element } = fakeVideoElement();
        const onNoVideo = vi.fn();
        const detector = new NoVideoOutputDetector(element, onNoVideo, vi.fn(), readable(false));

        detector.expectVideoWithin5Seconds();
        vi.advanceTimersByTime(5000);

        expect(onNoVideo).toHaveBeenCalledOnce();
        detector.destroy();
    });

    it("does not judge a hidden page, which renders no frame, and checks again once it shows", () => {
        const { element, renderFrame } = fakeVideoElement();
        const onNoVideo = vi.fn();
        const onVideo = vi.fn();
        const detector = new NoVideoOutputDetector(element, onNoVideo, onVideo, readable(false));

        setVisibility("hidden");
        detector.expectVideoWithin5Seconds();
        vi.advanceTimersByTime(60_000);
        expect(onNoVideo).not.toHaveBeenCalled();

        setVisibility("visible");
        renderFrame();
        vi.advanceTimersByTime(5000);
        expect(onNoVideo).not.toHaveBeenCalled();
        expect(onVideo).toHaveBeenCalled();
        detector.destroy();
    });

    it("still reports a missing video once the page shows again without any frame", () => {
        const { element } = fakeVideoElement();
        const onNoVideo = vi.fn();
        const detector = new NoVideoOutputDetector(element, onNoVideo, vi.fn(), readable(false));

        setVisibility("hidden");
        detector.expectVideoWithin5Seconds();
        vi.advanceTimersByTime(5000);
        setVisibility("visible");
        vi.advanceTimersByTime(5000);

        expect(onNoVideo).toHaveBeenCalledOnce();
        detector.destroy();
    });
});
