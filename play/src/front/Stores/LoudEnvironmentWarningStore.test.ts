/* eslint-disable @typescript-eslint/unbound-method */
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackgroundNoiseDetector } from "../WebRtc/NoiseSuppression/BackgroundNoiseDetector";
import {
    LOUD_ENVIRONMENT_DETECTION_BUDGET_MS,
    LoudEnvironmentDetectionController,
    type LoudEnvironmentDetectorDependencies,
    type LoudEnvironmentInput,
} from "./LoudEnvironmentDetectionController";

function createTrack(deviceId = "default"): MediaStreamTrack {
    const target = new EventTarget();
    return Object.assign(target, {
        kind: "audio",
        readyState: "live",
        getSettings: () => ({ deviceId }),
    }) as MediaStreamTrack;
}

function createHandle(): BackgroundNoiseDetector {
    return { dispose: vi.fn() };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe("LoudEnvironmentDetectionController", () => {
    // Resolves once the controller holds the detectors created so far: it awaits each one for a single microtask.
    async function detectorsRunning(count: number): Promise<void> {
        await vi.waitFor(() => expect(dependencies.createDetector).toHaveBeenCalledTimes(count));
        await Promise.resolve();
    }

    let input: ReturnType<typeof writable<LoudEnvironmentInput>>;
    let onNoise: (() => void) | undefined;
    let dependencies: LoudEnvironmentDetectorDependencies;
    let warnings: boolean[];

    beforeEach(() => {
        input = writable({
            track: undefined,
            microphoneRequested: false,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: undefined,
        });
        warnings = [];
        onNoise = undefined;
        dependencies = {
            createDetector: vi.fn((_context, _stream, callback: () => void) => {
                onNoise = callback;
                return Promise.resolve(createHandle());
            }),
            getAudioContext: vi.fn(() => ({ state: "running" }) as AudioContext),
            reportError: vi.fn(),
        };
    });

    it("starts only for an active raw microphone with suppression disabled", async () => {
        const controller = new LoudEnvironmentDetectionController(
            input,
            (warning) => warnings.push(warning),
            dependencies,
        );
        const track = createTrack();

        input.set({
            track,
            microphoneRequested: false,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: undefined,
        });
        input.update((value) => ({ ...value, microphoneRequested: true, silent: true }));
        input.update((value) => ({ ...value, silent: false, noiseSuppressionEnabled: true }));
        expect(dependencies.createDetector).not.toHaveBeenCalled();

        input.update((value) => ({ ...value, noiseSuppressionEnabled: false }));
        await vi.waitFor(() => expect(dependencies.createDetector).toHaveBeenCalledTimes(1));
        expect(dependencies.getAudioContext).toHaveBeenCalledTimes(1);
        expect((dependencies.createDetector as ReturnType<typeof vi.fn>).mock.calls[0]?.[1].getAudioTracks()).toEqual([
            track,
        ]);

        controller.destroy();
    });

    it("shows the warning once, then stops detecting for good", async () => {
        const handle = createHandle();
        dependencies.createDetector = vi.fn((_context, _stream, callback: () => void) => {
            onNoise = callback;
            return Promise.resolve(handle);
        });
        const controller = new LoudEnvironmentDetectionController(
            input,
            (warning) => warnings.push(warning),
            dependencies,
        );
        const track = createTrack();

        input.set({
            track,
            microphoneRequested: true,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: undefined,
        });
        await detectorsRunning(1);
        onNoise?.();

        expect(warnings.at(-1)).toBe(true);
        expect(handle.dispose).toHaveBeenCalledTimes(1);
        input.update((value) => ({ ...value, silent: true }));
        input.update((value) => ({ ...value, silent: false }));
        expect(dependencies.createDetector).toHaveBeenCalledTimes(1);

        // A new microphone session (an unmute) hides the warning and does not detect again.
        input.update((value) => ({ ...value, track: createTrack("other") }));
        expect(warnings.at(-1)).toBe(false);
        expect(dependencies.createDetector).toHaveBeenCalledTimes(1);
        controller.destroy();
    });

    it("stops when its time budget is spent, until the next microphone session", async () => {
        vi.useFakeTimers();
        try {
            const handle = createHandle();
            dependencies.createDetector = vi.fn(() => Promise.resolve(handle));
            const controller = new LoudEnvironmentDetectionController(input, vi.fn(), dependencies);

            input.set({
                track: createTrack(),
                microphoneRequested: true,
                silent: false,
                noiseSuppressionEnabled: false,
                requestedDeviceId: undefined,
            });
            await detectorsRunning(1);
            vi.advanceTimersByTime(LOUD_ENVIRONMENT_DETECTION_BUDGET_MS);
            expect(handle.dispose).toHaveBeenCalledTimes(1);

            input.update((value) => ({ ...value, silent: true }));
            input.update((value) => ({ ...value, silent: false }));
            expect(dependencies.createDetector).toHaveBeenCalledTimes(1);

            input.update((value) => ({ ...value, track: createTrack("other") }));
            expect(dependencies.createDetector).toHaveBeenCalledTimes(2);
            controller.destroy();
        } finally {
            vi.useRealTimers();
        }
    });

    it("disposes on suppression and requested device changes", async () => {
        const firstHandle = createHandle();
        const secondHandle = createHandle();
        dependencies.createDetector = vi.fn().mockResolvedValueOnce(firstHandle).mockResolvedValueOnce(secondHandle);
        const controller = new LoudEnvironmentDetectionController(input, vi.fn(), dependencies);
        const track = createTrack("first");

        input.set({
            track,
            microphoneRequested: true,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: "first",
        });
        await detectorsRunning(1);
        input.update((value) => ({ ...value, noiseSuppressionEnabled: true }));
        expect(firstHandle.dispose).toHaveBeenCalledTimes(1);

        input.set({
            track: createTrack("second"),
            microphoneRequested: true,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: "second",
        });
        await detectorsRunning(2);
        input.update((value) => ({ ...value, requestedDeviceId: "third" }));
        expect(secondHandle.dispose).toHaveBeenCalledTimes(1);
        controller.destroy();
    });

    it("disposes stale asynchronous initialization", async () => {
        const pending = deferred<BackgroundNoiseDetector>();
        const staleHandle = createHandle();
        dependencies.createDetector = vi
            .fn()
            .mockReturnValueOnce(pending.promise)
            .mockResolvedValueOnce(createHandle());
        const controller = new LoudEnvironmentDetectionController(input, vi.fn(), dependencies);

        input.set({
            track: createTrack("first"),
            microphoneRequested: true,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: "first",
        });
        input.set({
            track: createTrack("second"),
            microphoneRequested: true,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: "second",
        });
        pending.resolve(staleHandle);

        await vi.waitFor(() => expect(staleHandle.dispose).toHaveBeenCalledTimes(1));
        expect(dependencies.createDetector).toHaveBeenCalledTimes(2);
        controller.destroy();
    });

    it("reports initialization failure once and retries only for a new track session", async () => {
        const error = new Error("RNNoise failed");
        dependencies.createDetector = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(createHandle());
        const controller = new LoudEnvironmentDetectionController(input, vi.fn(), dependencies);

        input.set({
            track: createTrack("first"),
            microphoneRequested: true,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: "first",
        });
        await vi.waitFor(() => expect(dependencies.reportError).toHaveBeenCalledWith(error));
        input.update((value) => ({ ...value, silent: true }));
        input.update((value) => ({ ...value, silent: false }));
        expect(dependencies.createDetector).toHaveBeenCalledTimes(1);

        input.set({
            track: createTrack("second"),
            microphoneRequested: true,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: "second",
        });
        await vi.waitFor(() => expect(dependencies.createDetector).toHaveBeenCalledTimes(2));
        expect(dependencies.reportError).toHaveBeenCalledTimes(1);
        controller.destroy();
    });
});
