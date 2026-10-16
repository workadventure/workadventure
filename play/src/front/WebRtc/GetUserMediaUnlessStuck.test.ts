import { TimeoutError } from "@workadventure/shared-utils/src/Abort/TimeoutError";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET_USER_MEDIA_TIMEOUT_MS, getUserMediaUnlessStuck } from "./GetUserMediaUnlessStuck";

const trackAdminEvent = vi.hoisted(() => vi.fn());
vi.mock("../Administration/AnalyticsClient", () => ({ analyticsClient: { trackAdminEvent } }));

function fakeStream(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
    const stop = vi.fn();
    return { stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, stop };
}

// getUserMedia answers when `answer` is called, permissions.query answers `state` (or throws)
function stubBrowser(state: PermissionState | Error) {
    let answer: (stream: MediaStream) => void = () => {};
    vi.stubGlobal("navigator", {
        mediaDevices: {
            getUserMedia: vi.fn(
                () =>
                    new Promise<MediaStream>((resolve) => {
                        answer = resolve;
                    }),
            ),
        },
        permissions: {
            query: vi.fn(() => (state instanceof Error ? Promise.reject(state) : Promise.resolve({ state }))),
        },
    });
    return (stream: MediaStream) => answer(stream);
}

describe("getUserMediaUnlessStuck", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        trackAdminEvent.mockClear();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("gives up a request that access granted leaves pending, and releases the camera if it ever comes", async () => {
        const answer = stubBrowser("granted");
        const result = getUserMediaUnlessStuck({ video: true });
        const rejected = expect(result).rejects.toBeInstanceOf(TimeoutError);
        await vi.advanceTimersByTimeAsync(GET_USER_MEDIA_TIMEOUT_MS);
        await rejected;
        expect(trackAdminEvent).toHaveBeenCalledWith("media.device_error", {
            kind: "camera",
            reason: "get_user_media_timeout",
        });

        const late = fakeStream();
        answer(late.stream);
        await vi.advanceTimersByTimeAsync(0);
        expect(late.stop).toHaveBeenCalledOnce();
    });

    it("returns the camera that answers in time", async () => {
        const answer = stubBrowser("granted");
        const result = getUserMediaUnlessStuck({ video: true, audio: true });
        await vi.advanceTimersByTimeAsync(1000);
        const { stream } = fakeStream();
        answer(stream);
        await expect(result).resolves.toBe(stream);
    });

    it.each<[string, PermissionState | Error]>([
        ["while the browser asks the user", "prompt"],
        ["when the browser cannot tell", new TypeError("'camera' is not a valid PermissionName")],
    ])("waits for as long as it takes %s", async (_, state) => {
        const answer = stubBrowser(state);
        const result = getUserMediaUnlessStuck({ video: true });
        await vi.advanceTimersByTimeAsync(10 * GET_USER_MEDIA_TIMEOUT_MS);
        const { stream } = fakeStream();
        answer(stream);
        await expect(result).resolves.toBe(stream);
        expect(trackAdminEvent).not.toHaveBeenCalled();
    });
});
