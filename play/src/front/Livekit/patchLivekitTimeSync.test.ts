import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteTrack } from "livekit-client";
// Importing the module applies the patch as a side effect.
import "./patchLivekitTimeSync";

describe("patchLivekitTimeSync", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("replaces registerTimeSyncUpdate with a no-op that never starts the per-frame monitor", () => {
        const proto = RemoteTrack.prototype as { registerTimeSyncUpdate: () => void };

        expect(typeof proto.registerTimeSyncUpdate).toBe("function");

        const rafSpy = vi.fn<(cb: FrameRequestCallback) => number>(() => 1);
        vi.stubGlobal("requestAnimationFrame", rafSpy);

        const getSynchronizationSources = vi.fn(() => []);
        const fakeTrack = {
            receiver: { getSynchronizationSources },
            timeSyncHandle: undefined as number | undefined,
        };

        // Invoking the patched method must do nothing: no rAF loop, no getSynchronizationSources call.
        const result = proto.registerTimeSyncUpdate.call(fakeTrack);

        expect(result).toBeUndefined();
        expect(rafSpy).not.toHaveBeenCalled();
        expect(getSynchronizationSources).not.toHaveBeenCalled();
        expect(fakeTrack.timeSyncHandle).toBeUndefined();
    });
});
