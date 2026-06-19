/* eslint-disable @typescript-eslint/unbound-method */
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackgroundNoiseDetectorHandle } from "@workadventure/noise-suppression/background-noise";
import {
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

function createHandle(): BackgroundNoiseDetectorHandle {
    return {
        ready: Promise.resolve({
            type: "ready",
            sampleRate: 16_000,
            frameSamples: 512,
            frameDurationMs: 32,
            sileroModel: "v5",
        }),
        dispose: vi.fn(),
    };
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
    let input: ReturnType<typeof writable<LoudEnvironmentInput>>;
    let listener: ((message: { type: string }) => void) | undefined;
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
        listener = undefined;
        dependencies = {
            createDetector: vi.fn(() => Promise.resolve(createHandle())),
            observeDetector: vi.fn((_handle, callback) => {
                listener = callback;
                return vi.fn();
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

    it("latches the warning and disposes the detector after one event per track session", async () => {
        const handle = createHandle();
        dependencies.createDetector = vi.fn(() => Promise.resolve(handle));
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
        await vi.waitFor(() => expect(listener).toBeDefined());
        listener?.({ type: "background-noise-detected" });

        expect(warnings.at(-1)).toBe(true);
        expect(handle.dispose).toHaveBeenCalledTimes(1);
        input.update((value) => ({ ...value, silent: true }));
        input.update((value) => ({ ...value, silent: false }));
        expect(dependencies.createDetector).toHaveBeenCalledTimes(1);

        input.update((value) => ({ ...value, track: createTrack("other") }));
        await vi.waitFor(() => expect(dependencies.createDetector).toHaveBeenCalledTimes(2));
        expect(warnings.at(-1)).toBe(false);
        controller.destroy();
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
        await vi.waitFor(() => expect(dependencies.observeDetector).toHaveBeenCalledTimes(1));
        input.update((value) => ({ ...value, noiseSuppressionEnabled: true }));
        expect(firstHandle.dispose).toHaveBeenCalledTimes(1);

        input.set({
            track: createTrack("second"),
            microphoneRequested: true,
            silent: false,
            noiseSuppressionEnabled: false,
            requestedDeviceId: "second",
        });
        await vi.waitFor(() => expect(dependencies.observeDetector).toHaveBeenCalledTimes(2));
        input.update((value) => ({ ...value, requestedDeviceId: "third" }));
        expect(secondHandle.dispose).toHaveBeenCalledTimes(1);
        controller.destroy();
    });

    it("disposes stale asynchronous initialization", async () => {
        const pending = deferred<BackgroundNoiseDetectorHandle>();
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
        const error = new Error("Silero failed");
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
