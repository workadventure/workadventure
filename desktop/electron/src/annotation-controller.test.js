import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ sharing: true, owner: undefined, overlay: undefined, listener: undefined }));
vi.mock("electron", () => ({
    screen: {
        getAllDisplays: () => [{ id: 1, bounds: { x: 100, y: 50, width: 1000, height: 500 } }],
        getCursorScreenPoint: () => ({ x: 600, y: 175 }),
    },
}));
vi.mock("./platform-capture-policy", () => ({ canHideWindowsFromCapture: () => true }));
vi.mock("./tab-manager", () => ({ getControllingWorldContents: () => fake.owner }));
vi.mock("./presence", () => ({
    getPresenceSnapshot: () => ({ screenSharing: fake.sharing }),
    onPresenceChange: (listener) => {
        fake.listener = listener;
    },
}));
const open = vi.hoisted(() => vi.fn());
vi.mock("./child-windows", () => ({ openChildWindow: open }));
vi.mock("./hud-windows", () => ({
    getHudWindow: (kind) => (kind === "annotation" ? fake.overlay : undefined),
    closeHudWindow: () => {
        fake.overlay = undefined;
    },
}));
import { resetAnnotations, setAnnotationSource, setAnnotationState } from "./annotation-controller";
const passive = { visible: true, interactive: false, trackCursor: false };
const overlay = () => ({
    setIgnoreMouseEvents: vi.fn(),
    setFocusable: vi.fn(),
    isFocused: () => false,
    focus: vi.fn(),
});
beforeEach(() => {
    vi.useFakeTimers();
    resetAnnotations();
    setAnnotationSource(undefined);
    fake.owner = { id: 1, isDestroyed: () => false, send: vi.fn() };
    fake.sharing = true;
    open.mockReset().mockImplementation(async () => {
        fake.overlay = overlay();
        return true;
    });
});
afterEach(() => {
    resetAnnotations();
    vi.useRealTimers();
});
describe("Svelte annotation native lifecycle", () => {
    it("keeps remote annotations click-through without keyboard focus", async () => {
        setAnnotationSource(1);
        await setAnnotationState(fake.owner, passive);
        expect(open).toHaveBeenCalledWith("annotation", 1);
        expect(fake.overlay.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
        expect(fake.overlay.setFocusable).toHaveBeenCalledWith(false);
        expect(fake.overlay.focus).not.toHaveBeenCalled();
    });
    it("releases keyboard and pointer capture after explicit drawing ends", async () => {
        setAnnotationSource(1);
        await setAnnotationState(fake.owner, { ...passive, interactive: true });
        const window = fake.overlay;
        expect(window.setFocusable).toHaveBeenLastCalledWith(true);
        await setAnnotationState(fake.owner, passive);
        expect(window.setFocusable).toHaveBeenLastCalledWith(false);
        expect(window.setIgnoreMouseEvents).toHaveBeenLastCalledWith(true, { forward: true });
    });
    it("remembers a request while the shared display resolves", async () => {
        await setAnnotationState(fake.owner, passive);
        expect(open).not.toHaveBeenCalled();
        setAnnotationSource(1);
        await Promise.resolve();
        expect(open).toHaveBeenCalledWith("annotation", 1);
    });
    it("closes an overlay which finishes opening after the share stops", async () => {
        let finish;
        open.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = () => {
                        fake.overlay = overlay();
                        resolve(true);
                    };
                }),
        );
        setAnnotationSource(1);
        const pending = setAnnotationState(fake.owner, passive);
        fake.sharing = false;
        fake.listener();
        finish();
        await pending;
        expect(fake.overlay).toBeUndefined();
    });
    it("reopens on the latest display when the source changes during opening", async () => {
        let finish;
        open.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = () => {
                        fake.overlay = overlay();
                        resolve(true);
                    };
                }),
        );
        setAnnotationSource(1);
        const pending = setAnnotationState(fake.owner, passive);
        setAnnotationSource(2);
        finish();
        await pending;
        expect(open.mock.calls).toEqual([
            ["annotation", 1],
            ["annotation", 2],
        ]);
        expect(fake.overlay.setFocusable).toHaveBeenCalledWith(false);
    });
    it("retains a pending request during unrelated presence updates", async () => {
        await setAnnotationState(fake.owner, passive);
        fake.listener();
        setAnnotationSource(1);
        await Promise.resolve();
        expect(open).toHaveBeenCalledWith("annotation", 1);
    });
    it("rejects a background tab without changing the active overlay", async () => {
        setAnnotationSource(1);
        await setAnnotationState(fake.owner, passive);
        const window = fake.overlay;
        await setAnnotationState({ id: 2 }, { visible: false });
        expect(fake.overlay).toBe(window);
    });
    it("polls normalized positions without restarting on every update", async () => {
        setAnnotationSource(1);
        await setAnnotationState(fake.owner, { ...passive, trackCursor: true });
        vi.advanceTimersByTime(25);
        await setAnnotationState(fake.owner, { ...passive, trackCursor: true });
        vi.advanceTimersByTime(25);
        expect(fake.owner.send).toHaveBeenCalledWith("app:windows:annotation-cursor", 0.5, 0.25);
        fake.sharing = false;
        fake.listener();
        fake.owner.send.mockClear();
        vi.advanceTimersByTime(100);
        expect(fake.owner.send).not.toHaveBeenCalled();
    });
});
