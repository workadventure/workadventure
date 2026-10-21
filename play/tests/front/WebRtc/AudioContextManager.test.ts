import { describe, expect, it, vi } from "vitest";
import { audioContextManager } from "../../../src/front/WebRtc/AudioContextManager";
import { bindAudioOutput } from "../../../src/front/WebRtc/AudioOutputManager";

vi.mock("../../../src/front/WebRtc/AudioOutputManager", () => ({ bindAudioOutput: vi.fn() }));

// jsdom has no AudioContext
vi.stubGlobal(
    "AudioContext",
    class {
        state = "running";
        close() {
            this.state = "closed";
            return Promise.resolve();
        }
    },
);

describe("AudioContextManager", () => {
    it("keeps each context on the selected audio output until it is closed", async () => {
        const unbindDefault = vi.fn();
        const unbind48k = vi.fn();
        vi.mocked(bindAudioOutput).mockReturnValueOnce(unbindDefault).mockReturnValueOnce(unbind48k);

        const context = audioContextManager.getContext();
        expect(audioContextManager.getContext()).toBe(context);
        const context48k = audioContextManager.getContext(48_000);
        expect(vi.mocked(bindAudioOutput).mock.calls).toEqual([[context], [context48k]]);

        await audioContextManager.closeContext();
        expect(unbindDefault).toHaveBeenCalledOnce();
        expect(unbind48k).not.toHaveBeenCalled();

        await audioContextManager.closeAllContexts();
        expect(unbind48k).toHaveBeenCalledOnce();
    });
});
