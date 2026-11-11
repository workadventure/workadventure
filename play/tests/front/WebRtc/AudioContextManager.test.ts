import { describe, expect, it, vi } from "vitest";
import {
    audioContextManager,
    recoverFromRenderErrors,
    RENDER_RECOVERY_INTERVAL_MS,
    RENDER_RECOVERY_MAX_ATTEMPTS,
} from "../../../src/front/WebRtc/AudioContextManager";
import { applySinkId, bindAudioOutput } from "../../../src/front/WebRtc/AudioOutputManager";

vi.mock("../../../src/front/WebRtc/AudioOutputManager", () => ({
    applySinkId: vi.fn(() => Promise.resolve("applied")),
    bindAudioOutput: vi.fn(),
}));

// jsdom has no AudioContext
vi.stubGlobal(
    "AudioContext",
    class extends EventTarget {
        state = "running";
        constructor(public options?: AudioContextOptions) {
            super();
        }
        resume() {
            return Promise.resolve();
        }
        close() {
            this.state = "closed";
            return Promise.resolve();
        }
    },
);

describe("AudioContextManager", () => {
    // First: closeAllContexts(), in the next test, shuts the singleton down
    it("analyses audio on contexts without an output, apart from the ones that play", () => {
        const analysis = audioContextManager.getAnalysisContext();
        expect(audioContextManager.getAnalysisContext()).toBe(analysis);
        expect(analysis).toHaveProperty("options", { sinkId: { type: "none" } });

        const analysis16k = audioContextManager.getAnalysisContext(16_000);
        expect(analysis16k).not.toBe(analysis);
        expect(analysis16k).toHaveProperty("options", { sampleRate: 16_000, sinkId: { type: "none" } });

        // Never bound to the selected speaker
        expect(bindAudioOutput).not.toHaveBeenCalled();
    });

    it("keeps each context on the selected audio output until it is closed", async () => {
        const unbindDefault = vi.fn();
        const unbind48k = vi.fn();
        vi.mocked(bindAudioOutput).mockReturnValueOnce(unbindDefault).mockReturnValueOnce(unbind48k);

        const context = audioContextManager.getContext();
        expect(audioContextManager.getContext()).toBe(context);
        const context48k = audioContextManager.getContext(48_000);
        expect(vi.mocked(bindAudioOutput).mock.calls).toEqual([[context], [context48k]]);
        expect(audioContextManager.getAnalysisContext()).not.toBe(context);

        await audioContextManager.closeContext();
        expect(unbindDefault).toHaveBeenCalledOnce();
        expect(unbind48k).not.toHaveBeenCalled();

        await audioContextManager.closeAllContexts();
        expect(unbind48k).toHaveBeenCalledOnce();
    });

    describe("recoverFromRenderErrors", () => {
        function fakeContext() {
            const context = Object.assign(new EventTarget(), {
                state: "running",
                currentTime: 10,
                resume: vi.fn(() => Promise.resolve()),
                suspend: vi.fn(() => Promise.resolve()),
            });
            return { context, asAudioContext: context as unknown as AudioContext };
        }

        it("resumes a context left suspended by a render error until its clock moves again", () => {
            vi.useFakeTimers();
            const { context, asAudioContext } = fakeContext();
            const stop = recoverFromRenderErrors(asAudioContext);

            // Chrome reports the failure several times in a row, then suspends the context
            context.dispatchEvent(new Event("error"));
            context.dispatchEvent(new Event("error"));
            context.state = "suspended";

            vi.advanceTimersByTime(RENDER_RECOVERY_INTERVAL_MS);
            expect(context.resume).toHaveBeenCalledTimes(1);

            // The output is still unavailable: resume() changed nothing
            vi.advanceTimersByTime(RENDER_RECOVERY_INTERVAL_MS);
            expect(context.resume).toHaveBeenCalledTimes(2);

            context.state = "running";
            context.currentTime = 11;
            vi.advanceTimersByTime(RENDER_RECOVERY_INTERVAL_MS * 5);
            expect(context.resume).toHaveBeenCalledTimes(2);

            stop();
            vi.useRealTimers();
        });

        it("cycles a context that says it runs while its clock is frozen, and gives up eventually", async () => {
            vi.useFakeTimers();
            const { context, asAudioContext } = fakeContext();
            const stop = recoverFromRenderErrors(asAudioContext);

            context.dispatchEvent(new Event("error"));
            await vi.advanceTimersByTimeAsync(RENDER_RECOVERY_INTERVAL_MS);
            expect(context.suspend).toHaveBeenCalledTimes(1);
            expect(context.resume).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(RENDER_RECOVERY_INTERVAL_MS * RENDER_RECOVERY_MAX_ATTEMPTS * 2);
            expect(context.suspend).toHaveBeenCalledTimes(RENDER_RECOVERY_MAX_ATTEMPTS);

            stop();
            vi.useRealTimers();
        });

        it("moves the context to the default output only when its own output device is gone", async () => {
            vi.useFakeTimers();
            const speaker = { kind: "audiooutput", deviceId: "headset" };
            const enumerateDevices = vi.fn(() => Promise.resolve([speaker]));
            vi.stubGlobal("navigator", { mediaDevices: { enumerateDevices } });

            // Still plugged: the failure may pass, the user's choice is kept
            const present = fakeContext();
            Object.assign(present.context, { sinkId: "headset" });
            const stopPresent = recoverFromRenderErrors(present.asAudioContext);
            present.context.dispatchEvent(new Event("error"));
            await vi.advanceTimersByTimeAsync(0);
            expect(applySinkId).not.toHaveBeenCalled();

            // Unplugged: Chrome will not fall back by itself
            enumerateDevices.mockResolvedValue([]);
            const gone = fakeContext();
            Object.assign(gone.context, { sinkId: "headset" });
            const stopGone = recoverFromRenderErrors(gone.asAudioContext);
            gone.context.dispatchEvent(new Event("error"));
            gone.context.dispatchEvent(new Event("error"));
            await vi.advanceTimersByTimeAsync(0);
            expect(vi.mocked(applySinkId).mock.calls).toEqual([[gone.asAudioContext, ""]]);

            stopPresent();
            stopGone();
            vi.unstubAllGlobals();
            vi.useRealTimers();
        });

        it("leaves a context that recovered by itself alone", () => {
            vi.useFakeTimers();
            const { context, asAudioContext } = fakeContext();
            const stop = recoverFromRenderErrors(asAudioContext);

            context.dispatchEvent(new Event("error"));
            context.currentTime = 11;
            vi.advanceTimersByTime(RENDER_RECOVERY_INTERVAL_MS * 3);
            expect(context.resume).not.toHaveBeenCalled();
            expect(context.suspend).not.toHaveBeenCalled();

            stop();
            vi.useRealTimers();
        });
    });
});
