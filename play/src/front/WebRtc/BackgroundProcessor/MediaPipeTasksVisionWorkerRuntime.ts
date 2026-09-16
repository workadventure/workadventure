import { ImageSegmenter, type MPMask } from "@mediapipe/tasks-vision";
import { ResegmentController } from "./ResegmentController";
import { TasksVisionCompositor } from "./TasksVisionCompositor";
import {
    SEGMENTER_MODEL_URLS,
    TASKS_VISION_WORKER_FILESET,
    installTasksVisionModuleFactory,
    selectSegmenterModel,
    type SegmenterModel,
} from "./tasksVisionAssets";
import type {
    SerializedWorkerError,
    TasksVisionWorkerDelegate,
    TasksVisionWorkerRequest,
    TasksVisionWorkerResponse,
} from "./MediaPipeTasksVisionWorkerProtocol";
import type { BackgroundConfig } from "./createBackgroundTransformer";

const MAX_CONSECUTIVE_RECOVERY_ATTEMPTS = 2;
const STATS_WINDOW_MS = 15_000;
const SUCCESSFUL_FRAMES_BEFORE_RECOVERY_RESET = 30;

/** What the two transports hand to the renderer. */
type FrameSource = ImageBitmap | VideoFrame;

export type PostToMainThread = (message: TasksVisionWorkerResponse, transfer?: Transferable[]) => void;

class UnsupportedError extends Error {}

function serializeError(error: unknown): SerializedWorkerError {
    if (error instanceof Error) {
        return { name: error.name, message: error.message, stack: error.stack };
    }
    return { name: "Error", message: String(error) };
}

function closeQuietly(name: string, resource: { close(): void } | null): void {
    try {
        resource?.close();
    } catch (error) {
        console.warn(`[MediaPipe Tasks Vision Worker] Error closing ${name}:`, error);
    }
}

/**
 * Everything the background worker does, minus the postMessage plumbing, so it can be unit-tested.
 *
 * MediaPipe failures (lost WebGL context, segmenter crash) are recovered here, inside the worker, by rebuilding
 * the segmenter: the insertable-streams pipe transferred to this worker survives, and frames pass through
 * unprocessed meanwhile. Only exhausted recovery is reported as "fatal".
 */
export class MediaPipeTasksVisionWorkerRuntime {
    private config: BackgroundConfig = { mode: "none" };
    private glCanvas: OffscreenCanvas | null = null;
    private gl: WebGL2RenderingContext | null = null;
    private imageSegmenter: ImageSegmenter | null = null;
    private delegate: TasksVisionWorkerDelegate = "GPU";
    // The model follows the camera aspect ratio, which is only known once the first frame arrives.
    private model: SegmenterModel = "general";
    private modelSwitch: Promise<void> | null = null;
    private compositor: TasksVisionCompositor | null = null;
    private backgroundImage: ImageBitmap | null = null;
    private backgroundImageUrl: string | null = null;
    private backgroundCanvas: OffscreenCanvas | null = null;
    private lastTimestampMs = -1;
    // Segmentation runs every Nth frame; the mask is cloned and reused in between (see ResegmentController).
    private readonly resegmentController = new ResegmentController();
    private lastMask: MPMask | null = null;
    private framesSinceSegmentation = 0;
    private statsWindowStartedAt = -1;
    private statsRenderedFrames = 0;
    private statsSegmentations = 0;
    private statsSegmentationMs = 0;
    private recovery: Promise<void> | null = null;
    private consecutiveRecoveryAttempts = 0;
    private successfulFramesSinceRecovery = 0;
    private fatal = false;
    private activeStream: { streamId: number; abortController: AbortController } | null = null;
    private messageQueue: Promise<void> = Promise.resolve();

    constructor(private readonly post: PostToMainThread) {}

    public handleMessage(message: TasksVisionWorkerRequest): void {
        // Streams are not queued: "start-stream" installs a pipe that runs on its own, and "stop-stream" must not
        // wait behind a pending config update.
        if (message.type === "start-stream") {
            this.startStream(message.streamId, message.readable, message.writable);
            return;
        }
        if (message.type === "stop-stream") {
            this.stopStream(message.streamId);
            return;
        }
        this.messageQueue = this.messageQueue
            .then(async () => {
                if (message.type === "initialize") {
                    await this.initialize(message.config);
                } else if (message.type === "update-config") {
                    await this.updateConfig(message.requestId, message.config);
                } else {
                    this.processFrame(message.frameId, message.frame, message.timestampMs);
                }
            })
            .catch((error: unknown) => {
                console.error("[MediaPipe Tasks Vision Worker] Unexpected worker error:", error);
            });
    }

    private async initialize(config: BackgroundConfig): Promise<void> {
        this.config = { ...config };
        try {
            const delegate = await this.initializeMediaPipe();
            await this.updateBackgroundImage();
            this.post({ type: "ready", delegate });
        } catch (error) {
            this.dispose();
            if (error instanceof UnsupportedError) {
                this.post({ type: "unsupported", reason: error.message });
            } else {
                this.post({ type: "initialization-error", error: serializeError(error) });
            }
        }
    }

    private async initializeMediaPipe(): Promise<TasksVisionWorkerDelegate> {
        if (typeof OffscreenCanvas === "undefined") {
            throw new UnsupportedError("OffscreenCanvas is unavailable");
        }
        const glCanvas = new OffscreenCanvas(1, 1);
        const gl = glCanvas.getContext("webgl2");
        if (!gl) {
            throw new UnsupportedError("WebGL2 is unavailable in OffscreenCanvas workers");
        }
        this.glCanvas = glCanvas;
        this.gl = gl;

        try {
            this.delegate = "GPU";
            this.imageSegmenter = await this.createSegmenter(this.model);
        } catch (gpuError) {
            console.warn("[MediaPipe Tasks Vision Worker] GPU initialization failed, using CPU:", gpuError);
            this.delegate = "CPU";
            this.imageSegmenter = await this.createSegmenter(this.model);
        }
        this.compositor = new TasksVisionCompositor(gl, glCanvas);
        this.lastTimestampMs = -1;
        return this.delegate;
    }

    private async createSegmenter(model: SegmenterModel): Promise<ImageSegmenter> {
        if (!this.glCanvas) {
            throw new Error("The WebGL canvas is unavailable");
        }
        await installTasksVisionModuleFactory();
        return ImageSegmenter.createFromOptions(TASKS_VISION_WORKER_FILESET, {
            baseOptions: { modelAssetPath: SEGMENTER_MODEL_URLS[model], delegate: this.delegate },
            canvas: this.glCanvas,
            runningMode: "VIDEO",
            outputCategoryMask: false,
            outputConfidenceMasks: true,
        });
    }

    /**
     * Builds the segmenter for the camera's aspect ratio next to the running one and swaps it in when ready,
     * so no frame is skipped. A failed switch keeps the current segmenter.
     */
    private switchModel(model: SegmenterModel): void {
        if (this.modelSwitch) {
            return;
        }
        const previous = this.imageSegmenter;
        this.modelSwitch = this.createSegmenter(model)
            .then((next) => {
                if (this.imageSegmenter !== previous || !previous) {
                    // Disposed or rebuilt meanwhile: the rebuild already used this.model.
                    next.close();
                    return;
                }
                this.imageSegmenter = next;
                previous.close();
                console.info(`[MediaPipe Tasks Vision Worker] Switched to the ${model} segmentation model`);
            })
            .catch((error: unknown) => {
                console.warn(`[MediaPipe Tasks Vision Worker] Could not load the ${model} model:`, error);
            })
            .finally(() => {
                this.modelSwitch = null;
            });
        this.model = model;
    }

    private async updateBackgroundImage(): Promise<void> {
        const nextUrl = this.config.mode === "image" ? this.config.backgroundImage : undefined;
        if (nextUrl === this.backgroundImageUrl) {
            return;
        }

        let nextBackgroundImage: ImageBitmap | null = null;
        if (nextUrl) {
            const response = await fetch(nextUrl);
            if (!response.ok) {
                throw new Error(`Failed to load background image: HTTP ${response.status}`);
            }
            nextBackgroundImage = await createImageBitmap(await response.blob());
        }

        this.backgroundImage?.close();
        this.backgroundImage = nextBackgroundImage;
        this.backgroundImageUrl = nextUrl ?? null;
        this.backgroundCanvas = null;
    }

    private async updateConfig(requestId: number, nextConfig: Partial<BackgroundConfig>): Promise<void> {
        try {
            Object.assign(this.config, nextConfig);
            await this.updateBackgroundImage();
            this.post({ type: "config-updated", requestId });
        } catch (error) {
            this.post({ type: "config-update-error", requestId, error: serializeError(error) });
        }
    }

    // ---- image-bitmap transport ----

    private processFrame(frameId: number, frame: ImageBitmap, timestampMs: number): void {
        let output: ImageBitmap = frame;
        try {
            if (this.render(frame, frame.width, frame.height, timestampMs)) {
                output = this.glCanvas!.transferToImageBitmap();
            }
        } catch (error) {
            this.handleRenderFailure(error);
        }
        if (output !== frame) {
            frame.close();
        }
        this.post({ type: "frame", frameId, bitmap: output }, [output]);
    }

    // ---- insertable-streams transport ----

    private startStream(
        streamId: number,
        readable: ReadableStream<VideoFrame>,
        writable: WritableStream<VideoFrame>,
    ): void {
        this.stopStream(this.activeStream?.streamId);
        const abortController = new AbortController();
        this.activeStream = { streamId, abortController };

        const transformer = new TransformStream<VideoFrame, VideoFrame>({
            transform: (frame, controller) => this.transformVideoFrame(frame, controller),
        });
        readable
            .pipeThrough(transformer)
            .pipeTo(writable, { signal: abortController.signal })
            .catch((error: unknown) => {
                if (abortController.signal.aborted) {
                    return;
                }
                this.reportFatal(new Error("Background video pipe failed", { cause: error }));
            })
            .finally(() => {
                if (this.activeStream?.streamId === streamId) {
                    this.activeStream = null;
                }
            });
    }

    private stopStream(streamId: number | undefined): void {
        if (streamId === undefined || this.activeStream?.streamId !== streamId) {
            return;
        }
        this.activeStream.abortController.abort();
        this.activeStream = null;
    }

    private transformVideoFrame(frame: VideoFrame, controller: TransformStreamDefaultController<VideoFrame>): void {
        let output: VideoFrame = frame;
        try {
            // VideoFrame timestamps are microseconds; MediaPipe wants milliseconds.
            if (this.render(frame, frame.displayWidth, frame.displayHeight, frame.timestamp / 1000)) {
                output = new VideoFrame(this.glCanvas!, { timestamp: frame.timestamp, alpha: "discard" });
            }
        } catch (error) {
            this.handleRenderFailure(error);
        }
        controller.enqueue(output);
        if (output !== frame) {
            frame.close();
        }
    }

    // ---- rendering ----

    /**
     * Segments and composites the source onto the WebGL canvas. Returns false when the frame must be passed
     * through untouched (no effect, recovery in progress, no mask).
     */
    private render(source: FrameSource, width: number, height: number, timestampMs: number): boolean {
        if (this.config.mode === "none" || this.recovery || this.fatal || !width || !height) {
            return false;
        }
        const imageSegmenter = this.imageSegmenter;
        const glCanvas = this.glCanvas;
        if (!imageSegmenter || !glCanvas || !this.gl) {
            throw new Error("MediaPipe worker received a frame before initialization");
        }
        if (glCanvas.width !== width || glCanvas.height !== height) {
            glCanvas.width = width;
            glCanvas.height = height;
        }
        const model = selectSegmenterModel(width, height);
        if (model !== this.model) {
            this.switchModel(model);
        }

        // The Tasks Vision API requires strictly increasing timestamps.
        const monotonicTimestampMs = Math.max(timestampMs, this.lastTimestampMs + 1);
        this.lastTimestampMs = monotonicTimestampMs;

        const reusableMask =
            this.lastMask && this.lastMask.width === width && this.lastMask.height === height ? this.lastMask : null;
        if (reusableMask && this.framesSinceSegmentation < this.resegmentController.getInterval() - 1) {
            this.framesSinceSegmentation++;
            this.composite(source, reusableMask, width, height, false);
            this.gl.flush();
            this.recordRenderedFrame();
            return true;
        }

        let rendered = false;
        const segmentStartedAt = performance.now();
        imageSegmenter.segmentForVideo(source, monotonicTimestampMs, (segmentation) => {
            const segmentationMs = performance.now() - segmentStartedAt;
            this.resegmentController.tick(segmentationMs);
            this.statsSegmentations++;
            this.statsSegmentationMs += segmentationMs;
            const mask = segmentation.confidenceMasks?.[0];
            if (!mask) {
                return;
            }
            // The mask only lives for the duration of the callback: keep a copy for the next frames.
            this.lastMask?.close();
            this.lastMask = mask.clone();
            this.framesSinceSegmentation = 0;
            this.composite(source, mask, width, height, true);
            this.gl?.flush();
            rendered = true;
        });
        if (rendered) {
            this.markSuccessfulFrame();
            this.recordRenderedFrame();
        }
        return rendered;
    }

    private recordRenderedFrame(): void {
        const now = performance.now();
        if (this.statsWindowStartedAt < 0) {
            this.statsWindowStartedAt = now;
        }
        this.statsRenderedFrames++;
        const elapsedMs = now - this.statsWindowStartedAt;
        if (elapsedMs < STATS_WINDOW_MS) {
            return;
        }
        this.post({
            type: "stats",
            delegate: this.delegate,
            model: this.model,
            meanSegmentationMs: this.statsSegmentations ? this.statsSegmentationMs / this.statsSegmentations : 0,
            fps: (this.statsRenderedFrames * 1000) / elapsedMs,
            resegmentInterval: this.resegmentController.getInterval(),
        });
        this.statsWindowStartedAt = now;
        this.statsRenderedFrames = 0;
        this.statsSegmentations = 0;
        this.statsSegmentationMs = 0;
    }

    private composite(source: FrameSource, mask: MPMask, width: number, height: number, freshMask: boolean): void {
        const compositor = this.compositor;
        if (!compositor) {
            throw new Error("The WebGL compositor is unavailable");
        }
        const drawn =
            this.config.mode === "blur"
                ? compositor.drawBlur(source, mask, width, height, this.config.blurAmount || 15, freshMask)
                : compositor.drawReplace(
                      source,
                      mask,
                      this.getBackgroundCanvas(width, height),
                      width,
                      height,
                      freshMask,
                  );
        if (!drawn) {
            throw new Error("WebGL compositing failed");
        }
    }

    /** The background image scaled to cover the frame, rendered once per size. */
    private getBackgroundCanvas(width: number, height: number): OffscreenCanvas | null {
        const backgroundImage = this.backgroundImage;
        if (!backgroundImage) {
            return null;
        }
        const existing = this.backgroundCanvas;
        if (existing && existing.width === width && existing.height === height) {
            return existing;
        }
        // A new canvas object each time: the compositor caches the uploaded texture by object identity.
        const canvas = new OffscreenCanvas(width, height);
        this.backgroundCanvas = canvas;
        const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height);
        const scaledWidth = backgroundImage.width * scale;
        const scaledHeight = backgroundImage.height * scale;
        const context = canvas.getContext("2d")!;
        context.clearRect(0, 0, width, height);
        context.drawImage(
            backgroundImage,
            (width - scaledWidth) / 2,
            (height - scaledHeight) / 2,
            scaledWidth,
            scaledHeight,
        );
        return canvas;
    }

    // ---- recovery ----

    private markSuccessfulFrame(): void {
        if (this.consecutiveRecoveryAttempts === 0) {
            return;
        }
        this.successfulFramesSinceRecovery++;
        if (this.successfulFramesSinceRecovery >= SUCCESSFUL_FRAMES_BEFORE_RECOVERY_RESET) {
            this.consecutiveRecoveryAttempts = 0;
            this.successfulFramesSinceRecovery = 0;
        }
    }

    private handleRenderFailure(error: unknown): void {
        if (this.recovery || this.fatal) {
            return;
        }
        console.error(
            `[MediaPipe Tasks Vision Worker] Frame processing failed (webGlContextLost=${this.gl?.isContextLost() ?? true}):`,
            error,
        );
        this.recovery = this.recover()
            .catch((recoveryError: unknown) => {
                this.reportFatal(new Error("MediaPipe Tasks Vision recovery failed", { cause: recoveryError }));
            })
            .finally(() => {
                this.recovery = null;
            });
    }

    private async recover(): Promise<void> {
        if (this.consecutiveRecoveryAttempts >= MAX_CONSECUTIVE_RECOVERY_ATTEMPTS) {
            throw new Error("MediaPipe recovery attempts exhausted");
        }
        this.consecutiveRecoveryAttempts++;
        this.successfulFramesSinceRecovery = 0;
        this.dispose();
        try {
            await this.initializeMediaPipe();
            await this.updateBackgroundImage();
        } catch (error) {
            console.error("[MediaPipe Tasks Vision Worker] Recovery attempt failed:", error);
            return this.recover();
        }
        console.info(
            `[MediaPipe Tasks Vision Worker] Recovered after attempt ${this.consecutiveRecoveryAttempts}/${MAX_CONSECUTIVE_RECOVERY_ATTEMPTS}`,
        );
    }

    private reportFatal(error: Error): void {
        if (this.fatal) {
            return;
        }
        this.fatal = true;
        this.dispose();
        this.post({ type: "fatal", error: serializeError(error) });
    }

    private dispose(): void {
        closeQuietly("compositor", this.compositor);
        this.compositor = null;
        closeQuietly("ImageSegmenter", this.imageSegmenter);
        this.imageSegmenter = null;
        closeQuietly("last mask", this.lastMask);
        this.lastMask = null;
        this.framesSinceSegmentation = 0;
        this.gl?.getExtension("WEBGL_lose_context")?.loseContext();
        this.gl = null;
        this.glCanvas = null;
        this.backgroundCanvas = null;
    }
}
