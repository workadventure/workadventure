import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { trackAdminEvent, FakeTransformer } = vi.hoisted(() => {
    type StatusMessage = { status: "initializing" | "ready" | "error"; message?: string };
    type Tuning = { keystrokeFilter: boolean; postGain: boolean };
    type Options = { engine: string; tuning: Tuning; onStatusChange?: (message: StatusMessage) => void };

    class FakeTransformer {
        static instances: FakeTransformer[] = [];
        static supported = true;
        /** What a transform does; by default the model loads and reports ready. */
        static onTransform: (transformer: FakeTransformer) => void = (transformer) => transformer.emit("ready");

        readonly engine: string;
        readonly tuning: Tuning;
        readonly closeAndDestroy = vi.fn(() => Promise.resolve());
        readonly stop = vi.fn();

        constructor(private readonly options: Options) {
            this.engine = options.engine;
            this.tuning = options.tuning;
            FakeTransformer.instances.push(this);
        }

        static getSupport() {
            return FakeTransformer.supported ? { supported: true } : { supported: false, message: "no worklet" };
        }

        emit(status: StatusMessage["status"], message?: string): void {
            this.options.onStatusChange?.({ status, message });
        }

        transform(track: MediaStreamTrack): Promise<MediaStreamTrack> {
            FakeTransformer.onTransform(this);
            return Promise.resolve({ id: `processed-${track.id}` } as MediaStreamTrack);
        }
    }

    return {
        trackAdminEvent: vi.fn(),
        FakeTransformer,
    };
});

vi.mock("../Administration/AnalyticsClient", () => ({ analyticsClient: { trackAdminEvent } }));
// The real store module reads localStorage when it loads
vi.mock("./NoiseSuppressionStore", async () => {
    const { writable } = await import("svelte/store");
    return { noiseSuppressionStateStore: writable({ status: "disabled" }) };
});
vi.mock("../WebRtc/NoiseSuppression/NoiseSuppressionTransformer", () => ({
    NoiseSuppressionTransformer: FakeTransformer,
}));

const { NoiseSuppressionController } = await import("./NoiseSuppressionController");
const { noiseSuppressionStateStore } = await import("./NoiseSuppressionStore");

const microphone = { id: "mic" } as MediaStreamTrack;
const tuning = { keystrokeFilter: false, postGain: false };

function eventsNamed(name: string): unknown[] {
    return trackAdminEvent.mock.calls.filter(([eventName]) => eventName === name).map(([, properties]) => properties);
}

describe("NoiseSuppressionController", () => {
    beforeEach(() => {
        trackAdminEvent.mockClear();
        FakeTransformer.instances = [];
        FakeTransformer.supported = true;
        FakeTransformer.onTransform = (transformer) => transformer.emit("ready");
        noiseSuppressionStateStore.set({ status: "pendingInitialization" });
    });

    it("returns the processed track and counts one start per initialization", async () => {
        const controller = new NoiseSuppressionController();

        const track = await controller.transform(microphone, true, "deepfilternet", tuning);
        await controller.transform({ id: "other-mic" } as MediaStreamTrack, true, "deepfilternet", tuning);

        expect(track?.id).toBe("processed-mic");
        expect(get(noiseSuppressionStateStore).status).toBe("ready");
        expect(FakeTransformer.instances).toHaveLength(1);
        expect(eventsNamed("media.noise_suppression.started")).toEqual([
            { engine: "deepfilternet", initMs: expect.any(Number), hardwareConcurrency: expect.any(Number) },
        ]);
    });

    it("rebuilds the pipeline when a debug switch changes", async () => {
        const controller = new NoiseSuppressionController();
        await controller.transform(microphone, true, "deepfilternet", tuning);

        await controller.transform(microphone, true, "deepfilternet", { ...tuning, postGain: true });

        expect(FakeTransformer.instances).toHaveLength(2);
        expect(FakeTransformer.instances[0].closeAndDestroy).toHaveBeenCalledOnce();
    });

    it("rebuilds the pipeline when the engine changes", async () => {
        const controller = new NoiseSuppressionController();
        await controller.transform(microphone, true, "deepfilternet", tuning);

        await controller.transform(microphone, true, "dtln", tuning);

        expect(FakeTransformer.instances.map((transformer) => transformer.engine)).toEqual(["deepfilternet", "dtln"]);
        expect(FakeTransformer.instances[0].closeAndDestroy).toHaveBeenCalledOnce();
    });

    it("counts a failure reported twice (processorerror, then the rejected ready) once", async () => {
        FakeTransformer.onTransform = (transformer) => {
            transformer.emit("error", "The noise suppression AudioWorklet processor failed.");
            transformer.emit("error", "The DeepFilterNet3 AudioWorklet processor failed.");
        };
        const controller = new NoiseSuppressionController();

        await controller.transform(microphone, true, "deepfilternet", tuning);

        // The latest message is shown; only the transition to error is an analytics event
        expect(get(noiseSuppressionStateStore)).toEqual({
            status: "error",
            message: "The DeepFilterNet3 AudioWorklet processor failed.",
        });
        expect(eventsNamed("media.noise_suppression.failed")).toEqual([
            {
                engine: "deepfilternet",
                status: "error",
                reason: "The noise suppression AudioWorklet processor failed.",
            },
        ]);
        expect(eventsNamed("media.noise_suppression.started")).toEqual([]);
    });

    it("falls back to the raw microphone when the pipeline throws", async () => {
        FakeTransformer.onTransform = () => {
            throw new Error("wasm compile failed");
        };
        const controller = new NoiseSuppressionController();

        const track = await controller.transform(microphone, true, "deepfilternet", tuning);

        expect(track).toBe(microphone);
        expect(get(noiseSuppressionStateStore).status).toBe("error");
        expect(FakeTransformer.instances[0].closeAndDestroy).toHaveBeenCalledOnce();
        expect(eventsNamed("media.noise_suppression.failed")).toHaveLength(1);
    });

    it("reports an unsupported browser once and keeps the raw microphone", async () => {
        FakeTransformer.supported = false;
        const controller = new NoiseSuppressionController();

        const first = await controller.transform(microphone, true, "dtln", tuning);
        await controller.transform(microphone, true, "dtln", tuning);

        expect(first).toBe(microphone);
        expect(get(noiseSuppressionStateStore)).toEqual({ status: "unsupported", message: "no worklet" });
        expect(eventsNamed("media.noise_suppression.failed")).toEqual([
            { engine: "dtln", status: "unsupported", reason: "no worklet" },
        ]);
        expect(FakeTransformer.instances).toHaveLength(0);
    });

    it("passes the microphone through untouched when noise suppression is off", async () => {
        const controller = new NoiseSuppressionController();

        expect(await controller.transform(microphone, false, "deepfilternet", tuning)).toBe(microphone);
        expect(FakeTransformer.instances).toHaveLength(0);
        expect(trackAdminEvent).not.toHaveBeenCalled();
    });
});
