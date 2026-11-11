import { afterEach, describe, expect, it, vi } from "vitest";
import { observeElementSize } from "./childWindow";

afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
});

describe("observeElementSize", () => {
    it("observes from the window the element lives in, not from the page", () => {
        const pageObserver = vi.fn();
        vi.stubGlobal("ResizeObserver", pageObserver);
        const frame = document.createElement("iframe");
        document.body.append(frame);
        const child = frame.contentWindow;
        if (!child) throw new Error("Missing child window");
        let resize: () => void = () => {};
        const disconnect = vi.fn();
        Object.assign(child, {
            ResizeObserver: class {
                constructor(callback: () => void) {
                    resize = callback;
                }
                observe() {}
                disconnect = disconnect;
            },
        });
        const element = child.document.createElement("div");
        child.document.body.append(element);
        const sizes: number[][] = [];

        const stop = observeElementSize(element, (width, height) => sizes.push([width, height]));
        Object.defineProperty(element, "clientWidth", { value: 300 });
        Object.defineProperty(element, "clientHeight", { value: 200 });
        resize();
        stop();

        expect(pageObserver).not.toHaveBeenCalled();
        expect(sizes).toEqual([
            [0, 0],
            [300, 200],
        ]);
        expect(disconnect).toHaveBeenCalled();
    });
});
