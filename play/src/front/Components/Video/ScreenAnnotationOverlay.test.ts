import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, tick, unmount } from "svelte";
import { localAnnotationTargetStore, currentAnnotationToolStore } from "../../Stores/ScreenAnnotationStore";
import Overlay from "./ScreenAnnotationOverlay.svelte";

const manager = vi.hoisted(() => ({
    localUserId: "viewer",
    nextElementId: vi.fn(() => "pointer-id"),
    emitDraft: vi.fn(),
    dropDraft: vi.fn(),
    upsertElement: vi.fn(),
}));
vi.mock("../../Space/ScreenAnnotation/ScreenAnnotationManager", () => ({ screenAnnotationManager: manager }));

let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    localAnnotationTargetStore.set("presenter");
});
afterEach(async () => {
    const mounted = component;
    component = undefined;
    if (mounted) await unmount(mounted);
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

async function show() {
    currentAnnotationToolStore.set("pointer");
    component = mount(Overlay, { target: document.body, props: { targetUserId: "presenter", canDraw: true } });
    await tick();
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Missing canvas");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 100));
    return canvas;
}

function pointer(canvas: HTMLCanvasElement, type: string) {
    canvas.dispatchEvent(new MouseEvent(type, { clientX: 100, clientY: 25, bubbles: true }));
}

describe("screen annotation tools", () => {
    it("broadcasts the pointer on hover and drops it on leave without saving a stroke", async () => {
        const canvas = await show();
        pointer(canvas, "pointermove");
        expect(manager.emitDraft).toHaveBeenCalledWith(
            "presenter",
            expect.objectContaining({
                tool: "pointer",
                points: [{ x: 0.5, y: 0.25 }],
            }),
        );
        pointer(canvas, "pointerleave");
        expect(manager.dropDraft).toHaveBeenCalledWith("presenter", "pointer-id");
        expect(manager.upsertElement).not.toHaveBeenCalled();
    });
});
