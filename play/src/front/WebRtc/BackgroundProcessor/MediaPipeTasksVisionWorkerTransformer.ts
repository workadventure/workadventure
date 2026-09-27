import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import { raceAbort } from "@workadventure/shared-utils/src/Abort/raceAbort";
// Use an emitted URL so the worker type stays explicit in both dev and production.
import tasksVisionWorkerUrl from "./MediaPipeTasksVisionWorker?worker&url";
import type {
    SerializedWorkerError,
    TasksVisionWorkerDelegate,
    TasksVisionWorkerRequest,
    TasksVisionWorkerResponse,
} from "./MediaPipeTasksVisionWorkerProtocol";
import {
    BackgroundProcessingUnsupportedError,
    getBackgroundProcessingUnsupportedReason,
    type BackgroundConfig,
    type BackgroundEffectSampleHandler,
    type BackgroundTransformer,
    type BackgroundTransformerFailureHandler,
} from "./createBackgroundTransformer";

const DEFAULT_FRAME_RATE = 30;
const WORKER_INITIALIZATION_TIMEOUT_MS = 30_000;
const CONFIG_UPDATE_TIMEOUT_MS = 30_000;

export type BackgroundTransport = "insertable-streams" | "image-bitmap";

type PendingRequest = {
    resolve: () => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
};

function deserializeError(error: SerializedWorkerError): Error {
    const deserialized = new Error(error.message);
    deserialized.name = error.name;
    deserialized.stack = error.stack;
    return deserialized;
}

/**
 * Chromium exposes insertable streams: the camera track's frames are read and the output track's frames are
 * written entirely inside the worker, so the main thread does no per-frame work at all.
 */
export function selectBackgroundTransport(): BackgroundTransport {
    return typeof MediaStreamTrackProcessor === "function" && typeof MediaStreamTrackGenerator === "function"
        ? "insertable-streams"
        : "image-bitmap";
}

/**
 * Runs Tasks Vision inference and compositing in a dedicated worker (see MediaPipeTasksVisionWorkerRuntime).
 *
 * Two frame transports exist. On Chromium, insertable streams are transferred to the worker. Elsewhere
 * (Firefox, Safari 17+), the main thread copies each frame into an ImageBitmap, posts it, and draws the
 * returned bitmap on a canvas that is captured as the output track.
 */
export class MediaPipeTasksVisionWorkerTransformer implements BackgroundTransformer {
    public readonly transport: BackgroundTransport;
    private config: BackgroundConfig;
    private worker: Worker | null = null;
    private readonly initPromise: Promise<void>;
    private workerInitialization: PendingRequest | null = null;
    private readonly pendingConfigRequests = new Map<number, PendingRequest>();
    private nextConfigRequestId = 1;
    private workerDelegate: TasksVisionWorkerDelegate | "none" = "none";
    // Worker stats come every 15 s. One sample is reported per session, and one more after each change of effect.
    // The session sample waits for the third window: the resegment controller needs two consecutive 15 s
    // checkpoints to move, so anything earlier would only echo its default interval.
    private statsUntilSample = 3;
    private closed = false;

    // Insertable-streams transport.
    private streamGeneration = 0;
    private activeGenerator: MediaStreamTrackGenerator | null = null;

    // Image-bitmap transport.
    private outputCanvas: HTMLCanvasElement | null = null;
    private outputContext: CanvasRenderingContext2D | null = null;
    private inputVideo: HTMLVideoElement | null = null;
    private outputStream: MediaStream | null = null;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private frameIntervalMs = 1000 / DEFAULT_FRAME_RATE;
    private frameInFlight = false;
    private activeFrameId: number | null = null;
    private nextFrameId = 1;
    private lastTimestampMs = -1;
    private processingEnabled = false;
    private frameCount = 0;
    private readonly startTime = performance.now();

    constructor(
        config: BackgroundConfig,
        private readonly onTerminalFailure?: BackgroundTransformerFailureHandler,
        private readonly onSample?: BackgroundEffectSampleHandler,
    ) {
        this.config = { ...config };
        this.transport = selectBackgroundTransport();
        this.initPromise = this.startWorker();
        // Surfaced by waitForInitialization()/transform(); this only avoids an unhandled rejection when the
        // transformer is closed before either is called.
        this.initPromise.catch(() => undefined);
    }

    private async startWorker(): Promise<void> {
        const unsupportedReason = getBackgroundProcessingUnsupportedReason();
        if (unsupportedReason) {
            throw new BackgroundProcessingUnsupportedError(unsupportedReason);
        }

        const worker = new Worker(tasksVisionWorkerUrl, { type: "module" });
        this.worker = worker;
        worker.onmessage = (event: MessageEvent<TasksVisionWorkerResponse>) => this.handleWorkerMessage(event.data);
        worker.onerror = (event: ErrorEvent) => {
            event.preventDefault();
            const error =
                event.error instanceof Error ? event.error : new Error(event.message || "Tasks Vision worker error");
            if (this.workerInitialization) {
                this.settleInitialization(error);
            } else {
                this.fail(error);
            }
        };

        const initializationPromise = new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.settleInitialization(new Error("Tasks Vision worker initialization timed out"));
            }, WORKER_INITIALIZATION_TIMEOUT_MS);
            this.workerInitialization = { resolve, reject, timeoutId };
        });
        this.postToWorker({
            type: "initialize",
            config: { ...this.config, backgroundImage: this.resolveDocumentUrl(this.config.backgroundImage) },
        });
        await initializationPromise;
    }

    private settleInitialization(error?: Error): void {
        const pending = this.workerInitialization;
        if (!pending) {
            return;
        }
        this.workerInitialization = null;
        clearTimeout(pending.timeoutId);
        if (error) {
            pending.reject(error);
        } else {
            pending.resolve();
        }
    }

    private handleWorkerMessage(message: TasksVisionWorkerResponse): void {
        switch (message.type) {
            case "ready":
                this.workerDelegate = message.delegate;
                console.info(
                    `[MediaPipe Tasks Vision] Worker initialized with ${message.delegate}, transport: ${this.transport}`,
                );
                this.settleInitialization();
                return;
            case "unsupported":
                this.settleInitialization(new BackgroundProcessingUnsupportedError(message.reason));
                return;
            case "initialization-error":
                this.settleInitialization(deserializeError(message.error));
                return;
            case "config-updated":
            case "config-update-error": {
                const request = this.takePendingConfigRequest(message.requestId);
                if (message.type === "config-updated") {
                    request?.resolve();
                } else {
                    request?.reject(deserializeError(message.error));
                }
                return;
            }
            case "frame":
                this.handleProcessedFrame(message);
                return;
            case "fatal":
                this.fail(deserializeError(message.error));
                return;
            case "stats":
                if (this.statsUntilSample > 0 && this.config.mode !== "none" && --this.statsUntilSample === 0) {
                    this.onSample?.({
                        mode: this.config.mode,
                        transport: this.transport,
                        delegate: message.delegate,
                        model: message.model,
                        meanSegmentationMs: message.meanSegmentationMs,
                        fps: message.fps,
                        resegmentInterval: message.resegmentInterval,
                        hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
                    });
                }
                return;
        }
    }

    /** A failure the worker could not recover from: the transformer is closed and the caller told to stop. */
    private fail(error: Error): void {
        if (this.closed) {
            return;
        }
        console.error("[MediaPipe Tasks Vision] Worker failed:", error);
        this.close();
        try {
            this.onTerminalFailure?.(error);
        } catch (callbackError) {
            console.error("[MediaPipe Tasks Vision] Terminal failure handler failed:", callbackError);
        }
    }

    public async waitForInitialization(): Promise<void> {
        await this.initPromise;
    }

    public async updateConfig(nextConfig: Partial<BackgroundConfig>): Promise<void> {
        if (nextConfig.mode !== undefined && nextConfig.mode !== this.config.mode) {
            // The controller keeps its interval across a change of effect: the next window is already telling.
            this.statsUntilSample = 1;
        }
        Object.assign(this.config, nextConfig);
        await this.initPromise;

        const requestId = this.nextConfigRequestId++;
        const responsePromise = new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const error = new Error(`Tasks Vision worker config update ${requestId} timed out`);
                this.takePendingConfigRequest(requestId)?.reject(error);
                this.fail(error);
            }, CONFIG_UPDATE_TIMEOUT_MS);
            this.pendingConfigRequests.set(requestId, { resolve, reject, timeoutId });
        });
        try {
            const workerConfig = { ...nextConfig };
            if (nextConfig.backgroundImage !== undefined) {
                workerConfig.backgroundImage = this.resolveDocumentUrl(nextConfig.backgroundImage);
            }
            this.postToWorker({ type: "update-config", requestId, config: workerConfig });
        } catch (error) {
            this.takePendingConfigRequest(requestId)?.reject(error instanceof Error ? error : new Error(String(error)));
        }
        await responsePromise;

        if (this.transport === "image-bitmap") {
            if (this.config.mode === "none") {
                this.cancelScheduledFrame();
            } else if (this.outputStream && this.processingEnabled && !this.frameInFlight) {
                this.processFrame();
            }
        }
    }

    private resolveDocumentUrl(url: string | undefined): string | undefined {
        return url ? new URL(url, document.baseURI).href : undefined;
    }

    private takePendingConfigRequest(requestId: number): PendingRequest | undefined {
        const request = this.pendingConfigRequests.get(requestId);
        if (!request) {
            return undefined;
        }
        this.pendingConfigRequests.delete(requestId);
        clearTimeout(request.timeoutId);
        return request;
    }

    public getPerformanceStats(): unknown {
        const elapsed = performance.now() - this.startTime;
        return {
            transport: this.transport,
            workerDelegate: this.workerDelegate,
            closed: this.closed,
            // Frame accounting only exists on the main thread for the image-bitmap transport.
            fps: this.frameCount > 0 && elapsed > 0 ? Math.round((this.frameCount / elapsed) * 1000) : 0,
            frameCount: this.frameCount,
        };
    }

    public async transform(inputStream: MediaStream, signal?: AbortSignal): Promise<MediaStream> {
        await raceAbort(this.initPromise, signal);
        if (signal?.aborted) {
            throw signal.reason ?? new AbortError("Transform aborted after worker initialization");
        }
        if (this.closed) {
            throw new Error("Tasks Vision transformer is closed");
        }
        if (this.config.mode === "none") {
            return inputStream;
        }
        return this.transport === "insertable-streams"
            ? this.transformWithInsertableStreams(inputStream)
            : this.transformWithImageBitmaps(inputStream, signal);
    }

    public stop(): void {
        this.stopStream();
        this.processingEnabled = false;
        this.cancelScheduledFrame();
    }

    public close(): void {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.stop();
        this.settleInitialization(new Error("Tasks Vision worker was terminated during initialization"));
        this.worker?.terminate();
        this.worker = null;
        this.workerDelegate = "none";
        const error = new Error("Tasks Vision worker was terminated");
        for (const request of this.pendingConfigRequests.values()) {
            clearTimeout(request.timeoutId);
            request.reject(error);
        }
        this.pendingConfigRequests.clear();

        if (this.outputStream) {
            for (const track of this.outputStream.getVideoTracks()) {
                track.stop();
            }
            this.outputStream = null;
        }
        if (this.inputVideo) {
            this.inputVideo.pause();
            this.inputVideo.srcObject = null;
        }
    }

    private postToWorker(message: TasksVisionWorkerRequest, transfer?: Transferable[]): void {
        if (!this.worker) {
            throw new Error("Tasks Vision worker is unavailable");
        }
        this.worker.postMessage(message, transfer ?? []);
    }

    // ---- insertable-streams transport ----

    private transformWithInsertableStreams(inputStream: MediaStream): MediaStream {
        this.stopStream();
        const track = inputStream.getVideoTracks()[0];
        if (!track) {
            throw new Error("[MediaPipe Tasks Vision] The input stream has no video track");
        }
        if (!MediaStreamTrackProcessor || !MediaStreamTrackGenerator) {
            throw new BackgroundProcessingUnsupportedError("insertable streams are unavailable");
        }
        const processor = new MediaStreamTrackProcessor({ track });
        const generator = new MediaStreamTrackGenerator({ kind: "video" });
        const streamId = ++this.streamGeneration;
        this.postToWorker(
            { type: "start-stream", streamId, readable: processor.readable, writable: generator.writable },
            [processor.readable, generator.writable],
        );
        this.activeGenerator = generator;
        return new MediaStream([generator, ...inputStream.getAudioTracks()]);
    }

    private stopStream(): void {
        if (!this.activeGenerator) {
            return;
        }
        if (this.worker) {
            this.postToWorker({ type: "stop-stream", streamId: this.streamGeneration });
        }
        this.activeGenerator.stop();
        this.activeGenerator = null;
    }

    // ---- image-bitmap transport ----

    private async transformWithImageBitmaps(inputStream: MediaStream, signal?: AbortSignal): Promise<MediaStream> {
        if (!this.outputCanvas || !this.inputVideo) {
            this.outputCanvas = document.createElement("canvas");
            this.outputContext = this.outputCanvas.getContext("2d", { alpha: false, desynchronized: true });
            if (!this.outputContext) {
                throw new Error("Unable to create Tasks Vision output canvas");
            }
            this.inputVideo = document.createElement("video");
            this.inputVideo.autoplay = true;
            this.inputVideo.muted = true;
            this.inputVideo.playsInline = true;
        }
        const inputVideo = this.inputVideo;
        const outputCanvas = this.outputCanvas;

        this.processingEnabled = false;
        this.cancelScheduledFrame();
        inputVideo.srcObject = inputStream;

        const loadedMetadataPromise = new Promise<void>((resolve) => {
            if (inputVideo.readyState >= 2) {
                resolve();
            } else {
                inputVideo.addEventListener("loadedmetadata", () => resolve(), { once: true });
            }
        });
        await raceAbort(loadedMetadataPromise, signal);
        await raceAbort(inputVideo.play(), signal);
        if (signal?.aborted) {
            throw signal.reason ?? new AbortError("Transform aborted while starting video playback");
        }

        const videoWidth = inputVideo.videoWidth;
        const videoHeight = inputVideo.videoHeight;
        if (!videoWidth || !videoHeight) {
            throw new Error(`[MediaPipe Tasks Vision] Invalid video dimensions: ${videoWidth}x${videoHeight}.`);
        }

        const frameRate = inputStream.getVideoTracks()[0]?.getSettings().frameRate || DEFAULT_FRAME_RATE;
        this.frameIntervalMs = 1000 / frameRate;
        outputCanvas.width = videoWidth;
        outputCanvas.height = videoHeight;

        if (this.outputStream) {
            for (const track of this.outputStream.getVideoTracks()) {
                track.stop();
            }
        }
        const outputStream = outputCanvas.captureStream(frameRate);
        this.outputStream = outputStream;
        for (const audioTrack of inputStream.getAudioTracks()) {
            outputStream.addTrack(audioTrack);
        }

        this.processingEnabled = true;
        if (!this.frameInFlight) {
            this.processFrame();
        }
        return outputStream;
    }

    private processFrame(): void {
        const inputVideo = this.inputVideo;
        const outputCanvas = this.outputCanvas;
        if (
            this.closed ||
            !this.processingEnabled ||
            !this.worker ||
            !this.outputStream ||
            !inputVideo ||
            !outputCanvas ||
            this.config.mode === "none" ||
            this.frameInFlight
        ) {
            return;
        }
        if (!outputCanvas.width || !outputCanvas.height || !inputVideo.videoWidth || inputVideo.readyState < 2) {
            this.scheduleNextFrame();
            return;
        }

        this.frameInFlight = true;
        createImageBitmap(inputVideo)
            .then((frame) => {
                if (this.closed || !this.worker || !this.processingEnabled) {
                    frame.close();
                    return;
                }
                const frameId = this.nextFrameId++;
                const timestampMs = Math.max(performance.now(), this.lastTimestampMs + 1);
                this.lastTimestampMs = timestampMs;
                this.activeFrameId = frameId;
                this.postToWorker({ type: "process-frame", frameId, frame, timestampMs }, [frame]);
            })
            .catch((error: unknown) => {
                console.warn("[MediaPipe Tasks Vision] Failed to create or transfer a camera frame:", error);
            })
            .finally(() => {
                if (this.activeFrameId === null) {
                    this.frameInFlight = false;
                    this.scheduleNextFrame();
                }
            });
    }

    private handleProcessedFrame(message: Extract<TasksVisionWorkerResponse, { type: "frame" }>): void {
        if (message.frameId !== this.activeFrameId) {
            message.bitmap.close();
            return;
        }
        this.frameInFlight = false;
        this.activeFrameId = null;
        if (!this.closed && this.outputCanvas && this.outputContext) {
            this.outputContext.drawImage(message.bitmap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
            this.frameCount++;
        }
        message.bitmap.close();
        this.scheduleNextFrame();
    }

    private scheduleNextFrame(): void {
        this.cancelScheduledFrame();
        if (this.closed || !this.processingEnabled || !this.outputStream || this.config.mode === "none") {
            return;
        }
        this.timeoutId = setTimeout(() => this.processFrame(), this.frameIntervalMs);
    }

    private cancelScheduledFrame(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}
