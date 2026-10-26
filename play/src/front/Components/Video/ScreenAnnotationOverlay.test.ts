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
    if (component) await unmount(component);
    component = undefined;
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

async function show(tool: "text" | "pointer") {
    currentAnnotationToolStore.set(tool);
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
        const canvas = await show("pointer");
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

    it("focuses the text input and keeps typing away from game keyboard listeners", async () => {
        const canvas = await show("text");
        pointer(canvas, "pointerdown");
        await tick();
        const input = document.querySelector("input");
        if (!input) throw new Error("Missing text input");
        expect(document.activeElement).toBe(input);
        const gameKeyDown = vi.fn();
        window.addEventListener("keydown", gameKeyDown);
        try {
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }));
            expect(gameKeyDown).not.toHaveBeenCalled();
            input.value = "Annotation Linux";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            await tick();
            expect(manager.upsertElement).toHaveBeenCalledWith(
                "presenter",
                expect.objectContaining({
                    tool: "text",
                    text: "Annotation Linux",
                }),
            );
            expect(document.querySelector("input")).toBeNull();
        } finally {
            window.removeEventListener("keydown", gameKeyDown);
        }
    });
});
