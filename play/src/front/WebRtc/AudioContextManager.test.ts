import { beforeEach, describe, expect, it, vi } from "vitest";

import { AudioContextManager } from "./AudioContextManager";

class AudioContextMock {
    public onstatechange: ((this: AudioContext, event: Event) => unknown) | null = null;
    public state: AudioContextState = "suspended";
    public close = vi.fn(() => {
        if (this.state === "closed") {
            throw new DOMException("Can't close an AudioContext twice");
        }
        this.state = "closed";
        this.onstatechange?.call(this as unknown as AudioContext, new Event("statechange"));
        return Promise.resolve();
    });

    public setState(state: AudioContextState): void {
        this.state = state;
        this.onstatechange?.call(this as unknown as AudioContext, new Event("statechange"));
    }
}

describe("AudioContextManager", () => {
    let contexts: AudioContextMock[];

    beforeEach(() => {
        contexts = [];
        vi.stubGlobal(
            "AudioContext",
            vi.fn(function AudioContextConstructorMock() {
                const context = new AudioContextMock();
                contexts.push(context);
                return context;
            }),
        );
    });

    it("reuses the verification context while audio is suspended", () => {
        const manager = new AudioContextManager();

        expect(manager.verifyContextIsNotSuspended()).toBe(false);
        expect(manager.verifyContextIsNotSuspended()).toBe(false);

        expect(contexts).toHaveLength(1);
        expect(contexts[0].close).not.toHaveBeenCalled();
    });

    it("closes the verification context once when audio starts running", () => {
        const manager = new AudioContextManager();

        expect(manager.verifyContextIsNotSuspended()).toBe(false);
        contexts[0].setState("running");

        expect(contexts[0].close).toHaveBeenCalledOnce();
        expect(contexts[0].state).toBe("closed");
    });

    it("does not report a closed verification context as running", () => {
        const manager = new AudioContextManager();

        expect(manager.verifyContextIsNotSuspended()).toBe(false);
        contexts[0].setState("closed");

        expect(manager.verifyContextIsNotSuspended()).toBe(false);
        expect(contexts).toHaveLength(2);
        expect(contexts[0].close).not.toHaveBeenCalled();
    });
});
