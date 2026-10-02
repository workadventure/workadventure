import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type WorkerMessage = { type: string; requestId?: number; config?: { backgroundImage?: string } };

const workerMocks = vi.hoisted(
    (): {
        instances: Array<{
            onmessage: ((event: MessageEvent) => void) | null;
            messages: WorkerMessage[];
            transfers: Transferable[][];
            terminate: ReturnType<typeof vi.fn>;
            reply: (data: unknown) => void;
        }>;
        response: "ready" | "unsupported";
        respondToConfigUpdates: boolean;
    } => ({
        instances: [],
        response: "ready",
        respondToConfigUpdates: true,
    }),
);

vi.mock("../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionWorker?worker&url", () => ({
    default: "/assets/tasks-vision-worker.js",
}));

import { MediaPipeTasksVisionWorkerTransformer } from "../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionWorkerTransformer";
import { BackgroundProcessingUnsupportedError } from "../../../../src/front/WebRtc/BackgroundProcessor/createBackgroundTransformer";

class FakeWorker {
    public onmessage: ((event: MessageEvent) => void) | null = null;
    public onerror: ((event: ErrorEvent) => void) | null = null;
    public messages: WorkerMessage[] = [];
    public transfers: Transferable[][] = [];
    public terminate = vi.fn();

    constructor() {
        workerMocks.instances.push(this);
    }

    public postMessage(message: WorkerMessage, transfer: Transferable[] = []): void {
        this.messages.push(message);
        this.transfers.push(transfer);
        if (message.type === "update-config" && workerMocks.respondToConfigUpdates) {
            queueMicrotask(() => this.reply({ type: "config-updated", requestId: message.requestId }));
        }
        if (message.type === "initialize") {
            queueMicrotask(() =>
                this.reply(
                    workerMocks.response === "ready"
                        ? { type: "ready", delegate: "GPU" }
                        : { type: "unsupported", reason: "WebGL2 is unavailable in OffscreenCanvas workers" },
                ),
            );
        }
    }

    public reply(data: unknown): void {
        this.onmessage?.({ data } as MessageEvent);
    }
}

function installInsertableStreams(): { generatorTrack: MediaStreamTrack; readable: object; writable: object } {
    const readable = { readable: true };
    const writable = { writable: true };
    // A MediaStreamTrackGenerator is itself the output MediaStreamTrack.
    class FakeGenerator {
        public kind = "video";
        public writable = writable;
        public stop = vi.fn();
    }
    const generatorTrack = new FakeGenerator() as unknown as MediaStreamTrack;
    vi.stubGlobal(
        "MediaStreamTrackProcessor",
        class {
            public readable = readable;
        },
    );
    vi.stubGlobal("MediaStreamTrackGenerator", function () {
        return generatorTrack;
    });
    vi.stubGlobal(
        "MediaStream",
        class {
            constructor(public tracks: MediaStreamTrack[]) {}
            public getVideoTracks() {
                return this.tracks.filter((track) => track.kind === "video");
            }
            public getAudioTracks() {
                return this.tracks.filter((track) => track.kind === "audio");
            }
        },
    );
    return { generatorTrack, readable, writable };
}

describe("MediaPipeTasksVisionWorkerTransformer", () => {
    let transformer: MediaPipeTasksVisionWorkerTransformer | undefined;

    beforeEach(() => {
        workerMocks.response = "ready";
        workerMocks.respondToConfigUpdates = true;
        workerMocks.instances.length = 0;
        vi.stubGlobal("Worker", FakeWorker);
        vi.stubGlobal("OffscreenCanvas", class {});
        vi.stubGlobal("createImageBitmap", vi.fn());
        vi.stubGlobal("MediaStreamTrackProcessor", undefined);
        vi.stubGlobal("MediaStreamTrackGenerator", undefined);
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
            getExtension: () => null,
        } as unknown as WebGL2RenderingContext);
        vi.spyOn(console, "info").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        transformer?.close();
        transformer = undefined;
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("uses the image-bitmap transport when insertable streams are unavailable", async () => {
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" });
        await transformer.waitForInitialization();

        expect(workerMocks.instances).toHaveLength(1);
        expect(transformer.getPerformanceStats()).toMatchObject({ transport: "image-bitmap", workerDelegate: "GPU" });
    });

    it("transfers insertable streams to the worker and returns the generator track", async () => {
        const { generatorTrack, readable, writable } = installInsertableStreams();
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" });
        const inputTrack = { kind: "video" } as unknown as MediaStreamTrack;
        const audioTrack = { kind: "audio" } as unknown as MediaStreamTrack;

        const output = await transformer.transform(new MediaStream([inputTrack, audioTrack]));

        expect(transformer.transport).toBe("insertable-streams");
        const worker = workerMocks.instances[0];
        expect(worker.messages[1]).toEqual({ type: "start-stream", streamId: 1, readable, writable });
        expect(worker.transfers[1]).toEqual([readable, writable]);
        expect(output.getVideoTracks()).toEqual([generatorTrack]);
        expect(output.getAudioTracks()).toEqual([audioTrack]);

        transformer.stop();
        expect(worker.messages[2]).toEqual({ type: "stop-stream", streamId: 1 });
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(generatorTrack.stop).toHaveBeenCalledOnce();
    });

    it("rejects transform() with an unsupported error on a device with too few cores", async () => {
        vi.spyOn(navigator, "hardwareConcurrency", "get").mockReturnValue(2);
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" });

        await expect(transformer.transform(new MediaStream())).rejects.toThrow(
            "Background processing is not supported on this browser: only 2 CPU cores",
        );
        expect(workerMocks.instances).toHaveLength(0);
    });

    it("rejects transform() with an unsupported error when the worker cannot run WebGL2", async () => {
        workerMocks.response = "unsupported";
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" });

        await expect(transformer.transform(new MediaStream())).rejects.toBeInstanceOf(
            BackgroundProcessingUnsupportedError,
        );
    });

    it("resolves relative background image URLs against the document before sending them to the worker", async () => {
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" });
        await transformer.waitForInitialization();

        await transformer.updateConfig({ mode: "image", backgroundImage: "./static/images/background/library.jpg" });

        expect(workerMocks.instances[0].messages[1]).toMatchObject({
            type: "update-config",
            config: { backgroundImage: new URL("./static/images/background/library.jpg", document.baseURI).href },
        });
    });

    it("treats a stalled config update as a terminal failure", async () => {
        const onTerminalFailure = vi.fn();
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" }, onTerminalFailure);
        await transformer.waitForInitialization();
        vi.useFakeTimers();
        workerMocks.respondToConfigUpdates = false;

        const updatePromise = transformer.updateConfig({ blurAmount: 25 });
        const updateRejection = expect(updatePromise).rejects.toThrow("Tasks Vision worker config update 1 timed out");
        await vi.advanceTimersByTimeAsync(30_000);

        await updateRejection;
        expect(onTerminalFailure).toHaveBeenCalledOnce();
        expect(workerMocks.instances[0].terminate).toHaveBeenCalledOnce();
        expect(transformer.getPerformanceStats()).toMatchObject({ closed: true });
    });

    it("reports the third stats window after start, then the next one after each change of effect", async () => {
        const onSample = vi.fn();
        vi.spyOn(navigator, "hardwareConcurrency", "get").mockReturnValue(8);
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" }, undefined, onSample);
        await transformer.waitForInitialization();
        const stats = {
            type: "stats",
            delegate: "GPU",
            model: "landscape",
            meanSegmentationMs: 7.5,
            fps: 29,
            resegmentInterval: 2,
        };

        workerMocks.instances[0].reply(stats);
        workerMocks.instances[0].reply(stats);
        expect(onSample).not.toHaveBeenCalled();
        workerMocks.instances[0].reply({ ...stats, resegmentInterval: 1 });
        workerMocks.instances[0].reply(stats);
        expect(onSample).toHaveBeenCalledOnce();
        expect(onSample).toHaveBeenCalledWith({
            mode: "blur",
            transport: "image-bitmap",
            delegate: "GPU",
            model: "landscape",
            meanSegmentationMs: 7.5,
            fps: 29,
            resegmentInterval: 1,
            hardwareConcurrency: 8,
        });

        await transformer.updateConfig({ blurAmount: 50 });
        workerMocks.instances[0].reply(stats);
        expect(onSample).toHaveBeenCalledOnce();

        await transformer.updateConfig({ mode: "image", backgroundImage: "https://example.com/bg.jpg" });
        workerMocks.instances[0].reply(stats);
        expect(onSample).toHaveBeenCalledTimes(2);
        expect(onSample).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "image" }));
    });

    it("closes and reports a terminal failure when the worker gives up", async () => {
        const onTerminalFailure = vi.fn();
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" }, onTerminalFailure);
        await transformer.waitForInitialization();

        workerMocks.instances[0].reply({
            type: "fatal",
            error: { name: "Error", message: "MediaPipe recovery attempts exhausted" },
        });

        expect(onTerminalFailure).toHaveBeenCalledWith(
            expect.objectContaining({ message: "MediaPipe recovery attempts exhausted" }),
        );
        expect(workerMocks.instances[0].terminate).toHaveBeenCalledOnce();
        await expect(transformer.transform(new MediaStream())).rejects.toThrow("Tasks Vision transformer is closed");
    });
});
