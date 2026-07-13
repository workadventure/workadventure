import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mediaPipeMocks = vi.hoisted(() => ({
    createFromOptions: vi.fn(),
    forVisionTasks: vi.fn(),
    drawingUtilsClose: vi.fn(),
    drawConfidenceMask: vi.fn(),
}));

const blurMocks = vi.hoisted(() => ({
    compositorClose: vi.fn(),
    compositorDraw: vi.fn(() => true),
    rendererClose: vi.fn(),
    rendererDraw: vi.fn(() => "cpu-blur"),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
    FilesetResolver: {
        forVisionTasks: mediaPipeMocks.forVisionTasks,
    },
    ImageSegmenter: {
        createFromOptions: mediaPipeMocks.createFromOptions,
    },
    DrawingUtils: class {
        public close = mediaPipeMocks.drawingUtilsClose;
        public drawConfidenceMask = mediaPipeMocks.drawConfidenceMask;
    },
}));

vi.mock("../../../../src/front/WebRtc/BackgroundProcessor/CanvasBlurRenderer", () => ({
    CanvasBlurRenderer: class {
        public close = blurMocks.rendererClose;
        public drawBlurredImage = blurMocks.rendererDraw;
    },
}));

vi.mock("../../../../src/front/WebRtc/BackgroundProcessor/TasksVisionBlurCompositor", () => ({
    TasksVisionBlurCompositor: class {
        public close = blurMocks.compositorClose;
        public draw = blurMocks.compositorDraw;
    },
}));

import { MediaPipeTasksVisionTransformer } from "../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionTransformer";

interface SegmenterMock {
    close: ReturnType<typeof vi.fn>;
    segmentForVideo: ReturnType<typeof vi.fn>;
}

interface TestDom {
    contextLoss: ReturnType<typeof vi.fn>;
    inputTrack: MediaStreamTrack;
    outputTrackStop: ReturnType<typeof vi.fn>;
}

function createSegmenter(): SegmenterMock {
    return {
        close: vi.fn(),
        segmentForVideo: vi.fn(() => ({
            confidenceMasks: [],
            close: vi.fn(),
        })),
    };
}

function installTestDom(frameRate = 25): TestDom {
    const contextLoss = vi.fn();
    const inputTrack = {
        kind: "video",
        readyState: "live",
        getSettings: () => ({ frameRate }),
        stop: vi.fn(),
    } as unknown as MediaStreamTrack;
    const outputTrackStop = vi.fn();
    const outputTrack = {
        kind: "video",
        readyState: "live",
        stop: outputTrackStop,
    } as unknown as MediaStreamTrack;
    const inputVideo = {
        autoplay: false,
        muted: false,
        playsInline: false,
        srcObject: null,
        readyState: 2,
        videoWidth: 640,
        videoHeight: 360,
        currentTime: 1,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
    } as unknown as HTMLVideoElement;

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName === "video") {
            return inputVideo;
        }

        if (tagName === "canvas") {
            const context2d = {
                drawImage: vi.fn(),
                filter: "none",
            } as unknown as CanvasRenderingContext2D;
            const webGl = {
                flush: vi.fn(),
                getExtension: vi.fn(() => ({ loseContext: contextLoss })),
                isContextLost: vi.fn(() => false),
            } as unknown as WebGL2RenderingContext;
            return {
                width: 300,
                height: 150,
                getContext: vi.fn((contextId: string) => (contextId === "webgl2" ? webGl : context2d)),
                captureStream: vi.fn(() => new MediaStream([outputTrack])),
            } as unknown as HTMLCanvasElement;
        }

        throw new Error(`Unexpected element requested by test: ${tagName}`);
    });

    return { contextLoss, inputTrack, outputTrackStop };
}

async function flushPromises(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

describe("MediaPipeTasksVisionTransformer", () => {
    let transformer: MediaPipeTasksVisionTransformer | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(performance, "now").mockReturnValue(42_000);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        vi.spyOn(console, "info").mockImplementation(() => undefined);
        mediaPipeMocks.forVisionTasks.mockResolvedValue({});
    });

    afterEach(() => {
        transformer?.close();
        transformer = undefined;
        vi.restoreAllMocks();
        vi.useRealTimers();
        mediaPipeMocks.createFromOptions.mockReset();
        mediaPipeMocks.forVisionTasks.mockReset();
        mediaPipeMocks.drawingUtilsClose.mockReset();
        mediaPipeMocks.drawConfidenceMask.mockReset();
        blurMocks.compositorClose.mockReset();
        blurMocks.compositorDraw.mockReset().mockReturnValue(true);
        blurMocks.rendererClose.mockReset();
        blurMocks.rendererDraw.mockReset().mockReturnValue("cpu-blur");
    });

    it("uses monotonic millisecond timestamps and schedules frames from the input frame rate", async () => {
        const { inputTrack } = installTestDom(25);
        const segmenter = createSegmenter();
        mediaPipeMocks.createFromOptions.mockResolvedValue(segmenter);
        transformer = new MediaPipeTasksVisionTransformer({ mode: "blur" });

        await transformer.transform(new MediaStream([inputTrack]));

        expect(segmenter.segmentForVideo).toHaveBeenCalledTimes(1);
        expect(segmenter.segmentForVideo.mock.calls[0][1]).toBe(42_000);

        await vi.advanceTimersByTimeAsync(39);
        expect(segmenter.segmentForVideo).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1);
        expect(segmenter.segmentForVideo).toHaveBeenCalledTimes(2);
        expect(segmenter.segmentForVideo.mock.calls[1][1]).toBe(42_001);
    });

    it("replaces a failed segmenter and releases its WebGL context", async () => {
        const { contextLoss, inputTrack } = installTestDom();
        const failedSegmenter = createSegmenter();
        failedSegmenter.segmentForVideo.mockImplementationOnce(() => {
            throw new Error("Packet timestamp mismatch on free_memory");
        });
        const recoveredSegmenter = createSegmenter();
        mediaPipeMocks.createFromOptions
            .mockResolvedValueOnce(failedSegmenter)
            .mockResolvedValueOnce(recoveredSegmenter);
        transformer = new MediaPipeTasksVisionTransformer({ mode: "blur" });

        await transformer.transform(new MediaStream([inputTrack]));
        await flushPromises();

        expect(failedSegmenter.segmentForVideo).toHaveBeenCalledTimes(1);
        expect(failedSegmenter.close).toHaveBeenCalledTimes(1);
        expect(contextLoss).toHaveBeenCalledTimes(1);
        expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(40);
        expect(recoveredSegmenter.segmentForVideo).toHaveBeenCalledTimes(1);
    });

    it("surfaces a terminal failure when recovery would replace a directly captured WebGL canvas", async () => {
        vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 Chrome/126.0.0.0");
        const { contextLoss, inputTrack, outputTrackStop } = installTestDom();
        const failedSegmenter = createSegmenter();
        failedSegmenter.segmentForVideo.mockImplementationOnce(() => {
            throw new Error("Packet timestamp mismatch on free_memory");
        });
        mediaPipeMocks.createFromOptions.mockResolvedValue(failedSegmenter);
        const onTerminalFailure = vi.fn();
        transformer = new MediaPipeTasksVisionTransformer({ mode: "blur" }, onTerminalFailure);

        await transformer.transform(new MediaStream([inputTrack]));
        await flushPromises();

        expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledTimes(1);
        expect(onTerminalFailure).toHaveBeenCalledOnce();
        expect(outputTrackStop).toHaveBeenCalledOnce();
        expect(contextLoss).toHaveBeenCalledOnce();
    });

    it("closes the output and surfaces a terminal recovery failure", async () => {
        const { inputTrack, outputTrackStop } = installTestDom();
        const segmenters = [createSegmenter(), createSegmenter(), createSegmenter()];
        for (const segmenter of segmenters) {
            segmenter.segmentForVideo.mockImplementation(() => {
                throw new Error("Packet timestamp mismatch on free_memory");
            });
        }
        mediaPipeMocks.createFromOptions
            .mockResolvedValueOnce(segmenters[0])
            .mockResolvedValueOnce(segmenters[1])
            .mockResolvedValueOnce(segmenters[2]);
        const onTerminalFailure = vi.fn();
        transformer = new MediaPipeTasksVisionTransformer({ mode: "blur" }, onTerminalFailure);

        await transformer.transform(new MediaStream([inputTrack]));
        await flushPromises();
        await vi.advanceTimersByTimeAsync(40);
        await flushPromises();
        await vi.advanceTimersByTimeAsync(40);
        await flushPromises();

        expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledTimes(3);
        expect(onTerminalFailure).toHaveBeenCalledOnce();
        expect(onTerminalFailure.mock.calls[0][0]).toMatchObject({
            message: "MediaPipe Tasks Vision recovery failed",
        });
        expect(outputTrackStop).toHaveBeenCalledOnce();
    });
});
