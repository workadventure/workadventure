import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mediaPipeMocks = vi.hoisted(() => ({
    createFromOptions: vi.fn(),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
    ImageSegmenter: { createFromOptions: mediaPipeMocks.createFromOptions },
}));

vi.mock("../../../../src/front/WebRtc/BackgroundProcessor/tasksVisionAssets", () => ({
    TASKS_VISION_WORKER_FILESET: { wasmLoaderPath: "/assets/loader.js", wasmBinaryPath: "/assets/vision.wasm" },
    SEGMENTER_MODEL_URLS: { general: "/assets/general.tflite", landscape: "/assets/landscape.tflite" },
    selectSegmenterModel: (width: number, height: number) => (width / height >= 4 / 3 ? "landscape" : "general"),
    installTasksVisionModuleFactory: () => Promise.resolve(),
}));

const compositorMocks = vi.hoisted(() => ({
    drawBlur: vi.fn(
        (_source: unknown, _mask: unknown, _width: number, _height: number, _blurAmount: number, _freshMask: boolean) =>
            true,
    ),
    drawReplace: vi.fn(
        (
            _source: unknown,
            _mask: unknown,
            _background: unknown,
            _width: number,
            _height: number,
            _freshMask: boolean,
        ) => true,
    ),
}));

vi.mock("../../../../src/front/WebRtc/BackgroundProcessor/TasksVisionCompositor", () => ({
    TasksVisionCompositor: class {
        public close = vi.fn();
        public drawBlur = compositorMocks.drawBlur;
        public drawReplace = compositorMocks.drawReplace;
    },
}));

import { MediaPipeTasksVisionWorkerRuntime } from "../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionWorkerRuntime";
import type {
    TasksVisionWorkerRequest,
    TasksVisionWorkerResponse,
} from "../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionWorkerProtocol";

type Segmenter = { segmentForVideo: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

function createMask(width = 3, height = 4) {
    const mask = { width, height, getAsWebGLTexture: () => ({}), close: vi.fn(), clone: () => mask };
    return mask;
}

function createSegmenter(): Segmenter {
    return {
        close: vi.fn(),
        segmentForVideo: vi.fn((_source: unknown, _timestamp: number, callback: (result: unknown) => void) => {
            callback({ confidenceMasks: [createMask()] });
        }),
    };
}

// Portrait by default: the landscape model switch has its own test.
function createBitmap(width = 3, height = 4): ImageBitmap {
    return { width, height, close: vi.fn() };
}

function createVideoFrame(timestamp: number): VideoFrame {
    return { displayWidth: 3, displayHeight: 4, timestamp, close: vi.fn() } as unknown as VideoFrame;
}

describe("MediaPipeTasksVisionWorkerRuntime", () => {
    let posted: TasksVisionWorkerResponse[];
    let runtime: MediaPipeTasksVisionWorkerRuntime;
    let webgl2Available = true;
    const transferredBitmap = createBitmap();

    const send = (message: TasksVisionWorkerRequest) => runtime.handleMessage(message);
    const lastPosted = () => posted[posted.length - 1];
    const waitForPosted = (count: number) => vi.waitFor(() => expect(posted.length).toBeGreaterThanOrEqual(count));

    beforeEach(() => {
        posted = [];
        webgl2Available = true;
        compositorMocks.drawBlur.mockClear();
        compositorMocks.drawReplace.mockClear();
        mediaPipeMocks.createFromOptions.mockReset();
        mediaPipeMocks.createFromOptions.mockImplementation(() => Promise.resolve(createSegmenter()));
        vi.spyOn(console, "info").mockImplementation(() => undefined);
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        vi.stubGlobal(
            "OffscreenCanvas",
            class {
                constructor(
                    public width: number,
                    public height: number,
                ) {}
                public getContext(type: string) {
                    if (type === "webgl2") {
                        return webgl2Available
                            ? { flush: vi.fn(), isContextLost: () => false, getExtension: () => null }
                            : null;
                    }
                    return { clearRect: vi.fn(), drawImage: vi.fn(), filter: "none" };
                }
                public transferToImageBitmap() {
                    return transferredBitmap;
                }
            },
        );
        vi.stubGlobal(
            "VideoFrame",
            class {
                public timestamp: number;
                public close = vi.fn();
                constructor(
                    public source: unknown,
                    init: { timestamp: number },
                ) {
                    this.timestamp = init.timestamp;
                }
            },
        );
        runtime = new MediaPipeTasksVisionWorkerRuntime((message) => posted.push(message));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("reports the GPU delegate, then falls back to CPU when GPU initialization fails", async () => {
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(1);
        expect(lastPosted()).toEqual({ type: "ready", delegate: "GPU" });

        mediaPipeMocks.createFromOptions.mockReset();
        mediaPipeMocks.createFromOptions
            .mockRejectedValueOnce(new Error("no GPU"))
            .mockImplementation(() => Promise.resolve(createSegmenter()));
        runtime = new MediaPipeTasksVisionWorkerRuntime((message) => posted.push(message));
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(2);
        expect(lastPosted()).toEqual({ type: "ready", delegate: "CPU" });
    });

    it("reports the browser as unsupported when WebGL2 is unavailable in the worker", async () => {
        webgl2Available = false;
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(1);
        expect(lastPosted()).toMatchObject({ type: "unsupported", reason: expect.stringContaining("WebGL2") });
    });

    it("rebuilds the segmenter after a frame failure and passes that frame through untouched", async () => {
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(1);
        const brokenSegmenter = await mediaPipeMocks.createFromOptions.mock.results[0].value;
        brokenSegmenter.segmentForVideo.mockImplementation(() => {
            throw new Error("GPU context lost");
        });

        const failingFrame = createBitmap();
        send({ type: "process-frame", frameId: 1, frame: failingFrame, timestampMs: 10 });
        await waitForPosted(2);
        expect(lastPosted()).toMatchObject({ type: "frame", frameId: 1, bitmap: failingFrame });
        expect(brokenSegmenter.close).toHaveBeenCalledOnce();

        // Recovery is asynchronous; once the new segmenter is up, frames are processed again.
        await vi.waitFor(() => expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledTimes(2));
        const recoveredSegmenter = await mediaPipeMocks.createFromOptions.mock.results[1].value;
        await vi.waitFor(async () => {
            send({ type: "process-frame", frameId: 2, frame: createBitmap(), timestampMs: 20 });
            await waitForPosted(3);
            expect(recoveredSegmenter.segmentForVideo).toHaveBeenCalled();
        });
        expect(lastPosted()).toMatchObject({ type: "frame", bitmap: transferredBitmap });
        expect(posted.some((message) => message.type === "fatal")).toBe(false);
    });

    it("reports a fatal error once recovery attempts are exhausted", async () => {
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(1);
        const brokenSegmenter = await mediaPipeMocks.createFromOptions.mock.results[0].value;
        brokenSegmenter.segmentForVideo.mockImplementation(() => {
            throw new Error("GPU context lost");
        });
        mediaPipeMocks.createFromOptions.mockRejectedValue(new Error("still broken"));

        send({ type: "process-frame", frameId: 1, frame: createBitmap(), timestampMs: 10 });
        await vi.waitFor(() => expect(posted.some((message) => message.type === "fatal")).toBe(true));
        // Two attempts, each trying GPU then CPU.
        expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledTimes(1 + 2 * 2);
        expect(lastPosted()).toMatchObject({
            type: "fatal",
            error: { message: "MediaPipe Tasks Vision recovery failed" },
        });
    });

    it("segments every 2nd frame and reuses the previous mask in between", async () => {
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(1);
        const segmenter = await mediaPipeMocks.createFromOptions.mock.results[0].value;

        for (let frameId = 1; frameId <= 4; frameId++) {
            send({ type: "process-frame", frameId, frame: createBitmap(), timestampMs: frameId * 10 });
        }
        await waitForPosted(5);

        expect(segmenter.segmentForVideo).toHaveBeenCalledTimes(2);
        expect(
            posted.slice(1).every((message) => message.type === "frame" && message.bitmap === transferredBitmap),
        ).toBe(true);
    });

    it("tells the compositor whether the mask is fresh or reused", async () => {
        send({ type: "initialize", config: { mode: "blur", blurAmount: 25 } });
        await waitForPosted(1);

        send({ type: "process-frame", frameId: 1, frame: createBitmap(), timestampMs: 10 });
        send({ type: "process-frame", frameId: 2, frame: createBitmap(), timestampMs: 20 });
        await waitForPosted(3);

        expect(compositorMocks.drawBlur.mock.calls.map((call) => [call[4], call[5]])).toEqual([
            [25, true],
            [25, false],
        ]);
    });

    it("renders the background image scaled to the frame in replace mode", async () => {
        const backgroundBitmap = { width: 8, height: 6, close: vi.fn() };
        vi.stubGlobal(
            "fetch",
            vi.fn(() => Promise.resolve({ ok: true, blob: () => Promise.resolve({}) })),
        );
        vi.stubGlobal(
            "createImageBitmap",
            vi.fn(() => Promise.resolve(backgroundBitmap)),
        );
        send({ type: "initialize", config: { mode: "image", backgroundImage: "https://example.com/bg.jpg" } });
        await waitForPosted(1);

        send({ type: "process-frame", frameId: 1, frame: createBitmap(), timestampMs: 10 });
        await waitForPosted(2);

        expect(fetch).toHaveBeenCalledWith("https://example.com/bg.jpg");
        const [, , background, width, height, freshMask] = compositorMocks.drawReplace.mock.calls[0];
        expect(background).toBeInstanceOf(OffscreenCanvas);
        expect([width, height, freshMask]).toEqual([3, 4, true]);
    });

    it("switches to the landscape model once a landscape frame arrives, without skipping frames", async () => {
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(1);
        const generalSegmenter = await mediaPipeMocks.createFromOptions.mock.results[0].value;
        expect(mediaPipeMocks.createFromOptions.mock.calls[0][1]).toMatchObject({
            baseOptions: { modelAssetPath: "/assets/general.tflite" },
        });

        send({ type: "process-frame", frameId: 1, frame: createBitmap(16, 9), timestampMs: 10 });
        await waitForPosted(2);
        expect(generalSegmenter.segmentForVideo).toHaveBeenCalledOnce();
        expect(mediaPipeMocks.createFromOptions.mock.calls[1][1]).toMatchObject({
            baseOptions: { modelAssetPath: "/assets/landscape.tflite", delegate: "GPU" },
        });

        await vi.waitFor(() => expect(generalSegmenter.close).toHaveBeenCalledOnce());
        const landscapeSegmenter = await mediaPipeMocks.createFromOptions.mock.results[1].value;
        send({ type: "process-frame", frameId: 2, frame: createBitmap(16, 9), timestampMs: 20 });
        send({ type: "process-frame", frameId: 3, frame: createBitmap(16, 9), timestampMs: 30 });
        send({ type: "process-frame", frameId: 4, frame: createBitmap(16, 9), timestampMs: 40 });
        await waitForPosted(5);
        expect(landscapeSegmenter.segmentForVideo).toHaveBeenCalled();
        expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledTimes(2);
    });

    it("posts pipeline stats once a 15 s window of rendering has elapsed", async () => {
        let nowMs = 0;
        vi.spyOn(performance, "now").mockImplementation(() => nowMs);
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(1);

        // 4 frames over 16 s: two segmentations (every 2nd frame) that each take 6 ms.
        const segmenter = await mediaPipeMocks.createFromOptions.mock.results[0].value;
        segmenter.segmentForVideo.mockImplementation(
            (_source: unknown, _timestamp: number, callback: (result: unknown) => void) => {
                nowMs += 6;
                callback({ confidenceMasks: [createMask()] });
            },
        );
        for (const [frameId, atMs] of [
            [1, 0],
            [2, 5_000],
            [3, 10_000],
            [4, 16_000],
        ]) {
            nowMs = atMs;
            send({ type: "process-frame", frameId, frame: createBitmap(), timestampMs: atMs });
            // Frames are processed one at a time so the clock is read at each frame's own time.
            // eslint-disable-next-line no-await-in-loop
            await waitForPosted(1 + frameId);
        }

        const stats = posted.find((message) => message.type === "stats");
        expect(stats).toMatchObject({
            delegate: "GPU",
            model: "general",
            meanSegmentationMs: 6,
            resegmentInterval: 2,
        });
        expect(stats && stats.type === "stats" ? stats.fps : NaN).toBeCloseTo(4000 / 16_006, 2);
    });

    it("pipes insertable-stream frames through the segmenter and stops on request", async () => {
        send({ type: "initialize", config: { mode: "blur" } });
        await waitForPosted(1);
        const segmenter = await mediaPipeMocks.createFromOptions.mock.results[0].value;

        const written: VideoFrame[] = [];
        const input = createVideoFrame(1_000_000);
        const readable = new ReadableStream<VideoFrame>({
            start(controller) {
                controller.enqueue(input);
            },
        });
        const writable = new WritableStream<VideoFrame>({
            write(frame) {
                written.push(frame);
            },
        });
        send({ type: "start-stream", streamId: 1, readable, writable });

        await vi.waitFor(() => expect(written).toHaveLength(1));
        expect(segmenter.segmentForVideo).toHaveBeenCalledWith(input, 1000, expect.any(Function));
        expect(written[0]).not.toBe(input);
        expect(written[0].timestamp).toBe(1_000_000);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(input.close).toHaveBeenCalledOnce();

        send({ type: "stop-stream", streamId: 1 });
        await vi.waitFor(() => expect(readable.locked).toBe(false));
        expect(posted.some((message) => message.type === "fatal")).toBe(false);
    });
});
