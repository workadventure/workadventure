import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pumpBootWhileFramesAreMissing } from "../../../../src/front/Phaser/Game/BackgroundBoot";

/** Phaser's TimeStep, reduced to what the pump touches. */
function fakeLoop() {
    return {
        tick: vi.fn<() => void>(),
        sleep: vi.fn<() => void>(),
        wake: vi.fn<(seamless?: boolean) => void>(),
    };
}

const FRAMES_MISSING_AFTER_MS = 100;
const GIVE_UP_AFTER_MS = 60_000;

let now = 0;
let pendingFrame: FrameRequestCallback | undefined;
let clocks: FakeWorker[] = [];
let workerThrows = false;

/** Stands in for the blob worker: `fire()` is one clock beat. */
class FakeWorker {
    public onmessage: (() => void) | null = null;
    public terminated = false;

    public constructor() {
        if (workerThrows) {
            throw new Error("workers are blocked here");
        }
        clocks.push(this);
    }

    public fire(): void {
        // A terminated worker delivers nothing more; the double has to model that, or a test can
        // pass while the real clock keeps running.
        if (this.terminated) {
            return;
        }
        this.onmessage?.();
    }

    public terminate(): void {
        this.terminated = true;
    }
}

/** The renderer paints: whoever asked for a frame gets one, and the clock reads fresh. */
function deliverFrame(): void {
    const frame = pendingFrame;
    pendingFrame = undefined;
    frame?.(now);
}

/** Beats the clock `count` times, advancing time as a 16ms worker would. */
function beat(count = 1): void {
    for (let i = 0; i < count; i++) {
        now += 16;
        clocks.forEach((clock) => clock.fire());
    }
}

beforeEach(() => {
    now = 0;
    pendingFrame = undefined;
    clocks = [];
    workerThrows = false;
    vi.useFakeTimers();
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        pendingFrame = callback;
        return 1;
    });
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("Blob", class {});
    vi.stubGlobal("URL", { createObjectURL: () => "blob:clock", revokeObjectURL: vi.fn() });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("pumpBootWhileFramesAreMissing", () => {
    it("clocks the loop once frames have gone missing", () => {
        const loop = fakeLoop();
        const stop = pumpBootWhileFramesAreMissing(loop);

        // Still within the tolerance: the renderer is merely between frames.
        beat(FRAMES_MISSING_AFTER_MS / 16 - 1);
        expect(loop.tick).not.toHaveBeenCalled();

        beat(2);
        expect(loop.tick).toHaveBeenCalled();

        stop();
    });

    it("stays out of the way while frames keep arriving", () => {
        const loop = fakeLoop();
        const stop = pumpBootWhileFramesAreMissing(loop);

        for (let i = 0; i < 40; i++) {
            deliverFrame();
            beat();
        }

        expect(loop.tick).not.toHaveBeenCalled();
        stop();
    });

    it("takes over when frames stop, and steps aside when they come back", () => {
        const loop = fakeLoop();
        const stop = pumpBootWhileFramesAreMissing(loop);

        // Hidden: nothing paints any more.
        beat(20);
        const whileHidden = loop.tick.mock.calls.length;
        expect(whileHidden).toBeGreaterThan(0);

        // Phaser's clock is handed over once, not at every beat.
        expect(loop.sleep).toHaveBeenCalledTimes(1);
        expect(loop.wake).not.toHaveBeenCalled();

        // Back on screen: every beat finds a fresh frame.
        for (let i = 0; i < 20; i++) {
            deliverFrame();
            beat();
        }
        expect(loop.tick).toHaveBeenCalledTimes(whileHidden);
        expect(loop.wake).toHaveBeenCalledTimes(1);

        stop();
    });

    it("stops for good once the world is reached, and lets the clock go", () => {
        const loop = fakeLoop();
        const stop = pumpBootWhileFramesAreMissing(loop);

        beat(20);
        const pumped = loop.tick.mock.calls.length;
        expect(pumped).toBeGreaterThan(0);

        stop();
        expect(clocks[0].terminated).toBe(true);
        // Handed back even though no frame ever came: a window revealed later must still redraw.
        expect(loop.wake).toHaveBeenCalledTimes(1);

        beat(20);
        expect(loop.tick).toHaveBeenCalledTimes(pumped);
    });

    it("gives up on a boot that never gets there, so a waiting screen is not pumped forever", () => {
        const loop = fakeLoop();
        pumpBootWhileFramesAreMissing(loop);

        beat(20);
        const pumped = loop.tick.mock.calls.length;
        expect(pumped).toBeGreaterThan(0);

        vi.advanceTimersByTime(GIVE_UP_AFTER_MS);
        expect(clocks[0].terminated).toBe(true);
        expect(loop.wake).toHaveBeenCalledTimes(1);

        beat(20);
        expect(loop.tick).toHaveBeenCalledTimes(pumped);
    });

    it("survives being stopped twice", () => {
        const stop = pumpBootWhileFramesAreMissing(fakeLoop());
        stop();
        expect(() => stop()).not.toThrow();
    });

    it("degrades to the old behaviour rather than breaking the boot when workers are unavailable", () => {
        workerThrows = true;
        const loop = fakeLoop();

        const stop = pumpBootWhileFramesAreMissing(loop);

        expect(() => stop()).not.toThrow();
        expect(loop.tick).not.toHaveBeenCalled();
    });
});
