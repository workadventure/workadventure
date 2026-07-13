import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import { raceAbort } from "@workadventure/shared-utils/src/Abort/raceAbort";
// MediaPipe loads its generated WASM loader with importScripts(), so this worker
// must have an HTTP URL rather than a blob URL.
import TasksVisionWorker from "./MediaPipeTasksVisionWorker?worker";
import type {
    SerializedWorkerError,
    TasksVisionWorkerRequest,
    TasksVisionWorkerResponse,
} from "./MediaPipeTasksVisionWorkerProtocol";
import type { MediaPipeTasksVisionTransformer } from "./MediaPipeTasksVisionTransformer";
import type {
    BackgroundConfig,
    BackgroundTransformer,
    BackgroundTransformerFailureHandler,
} from "./createBackgroundTransformer";

const DEFAULT_FRAME_RATE = 30;
const WORKER_INITIALIZATION_TIMEOUT_MS = 30_000;
const CONFIG_UPDATE_TIMEOUT_MS = 30_000;
const MAX_CONSECUTIVE_RECOVERY_ATTEMPTS = 2;
const SUCCESSFUL_FRAMES_BEFORE_RECOVERY_RESET = 30;

class UnsupportedTasksVisionWorkerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnsupportedTasksVisionWorkerError";
    }
}

type PendingRequestCallbacks = {
    resolve: () => void;
    reject: (error: Error) => void;
};

type PendingConfigRequest = PendingRequestCallbacks & {
    timeoutId: ReturnType<typeof setTimeout>;
};

type PendingInitialFrame = PendingRequestCallbacks & {
    generation: number;
};

function deserializeError(error: SerializedWorkerError): Error {
    const deserialized = new Error(error.message);
    deserialized.name = error.name;
    deserialized.stack = error.stack;
    return deserialized;
}

/**
 * Runs Tasks Vision inference and compositing in a dedicated worker.
 *
 * Safari 16 is the only supported browser family that needs the main-thread
 * compatibility fallback below: 16.0-16.3 has no OffscreenCanvas and 16.4-16.6
 * only supports its 2D context in workers. Safari 17 added OffscreenCanvas WebGL.
 * Once WorkAdventure no longer supports Safari 16, remove
 * UnsupportedTasksVisionWorkerError and MediaPipeTasksVisionTransformer from this
 * class. Worker restart and terminal-error handling are runtime recovery, not part
 * of that removable browser compatibility fallback.
 */
export class MediaPipeTasksVisionWorkerTransformer implements BackgroundTransformer {
    private readonly outputCanvas: HTMLCanvasElement;
    private readonly outputContext: CanvasRenderingContext2D;
    private readonly inputVideo: HTMLVideoElement;
    private config: BackgroundConfig;
    private worker: Worker | null = null;
    private fallback: MediaPipeTasksVisionTransformer | null = null;
    private backgroundVideo: HTMLVideoElement | null = null;
    private backgroundVideoUrl: string | null = null;
    private outputStream: MediaStream | null = null;
    private initPromise: Promise<void>;
    private workerInitializationResolve: (() => void) | null = null;
    private workerInitializationReject: ((error: Error) => void) | null = null;
    private workerInitializationTimeout: ReturnType<typeof setTimeout> | null = null;
    private pendingConfigRequests = new Map<number, PendingConfigRequest>();
    private pendingInitialFrame: PendingInitialFrame | null = null;
    private nextConfigRequestId = 1;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private recoveryPromise: Promise<void> | null = null;
    private frameRate = DEFAULT_FRAME_RATE;
    private frameIntervalMs = 1000 / DEFAULT_FRAME_RATE;
    private frameInFlight = false;
    private activeFrameId: number | null = null;
    private activeFrameGeneration = 0;
    private nextFrameId = 1;
    private streamGeneration = 0;
    private lastTimestampMs = -1;
    private consecutiveRecoveryAttempts = 0;
    private successfulFramesSinceRecovery = 0;
    private frameCount = 0;
    private startTime = performance.now();
    private blurBackend: "webgl-blur" | "none" = "none";
    private workerDelegate: "GPU" | "CPU" | "none" = "none";
    private processingEnabled = false;
    private closed = false;

    constructor(
        config: BackgroundConfig,
        private readonly onTerminalFailure?: BackgroundTransformerFailureHandler,
    ) {
        this.config = { ...config };
        this.outputCanvas = document.createElement("canvas");
        const outputContext = this.outputCanvas.getContext("2d", { alpha: false, desynchronized: true });
        if (!outputContext) {
            throw new Error("Unable to create Tasks Vision output canvas");
        }
        this.outputContext = outputContext;

        this.inputVideo = document.createElement("video");
        this.inputVideo.autoplay = true;
        this.inputVideo.muted = true;
        this.inputVideo.playsInline = true;

        this.initPromise = this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.startWorker();
            await this.updateBackgroundVideo();
        } catch (error) {
            this.terminateWorker();
            if (!(error instanceof UnsupportedTasksVisionWorkerError)) {
                throw error;
            }

            console.info(
                `[MediaPipe Tasks Vision] Worker rendering is unsupported (${error.message}); ` +
                    "using the Safari 16 main-thread compatibility fallback.",
            );
            const { MediaPipeTasksVisionTransformer } = await import("./MediaPipeTasksVisionTransformer");
            const fallback = new MediaPipeTasksVisionTransformer({ ...this.config }, this.onTerminalFailure);
            this.fallback = fallback;
            await fallback.waitForInitialization();
        }
    }

    private async startWorker(): Promise<void> {
        if (
            typeof Worker === "undefined" ||
            typeof OffscreenCanvas === "undefined" ||
            typeof createImageBitmap === "undefined"
        ) {
            throw new UnsupportedTasksVisionWorkerError("required worker canvas APIs are unavailable");
        }
        if (this.closed) {
            throw new Error("Cannot initialize a closed Tasks Vision transformer");
        }

        const worker = new TasksVisionWorker();
        this.worker = worker;
        worker.onmessage = (event: MessageEvent<TasksVisionWorkerResponse>) => this.handleWorkerMessage(event.data);
        worker.onerror = (event: ErrorEvent) => {
            event.preventDefault();
            const error =
                event.error instanceof Error ? event.error : new Error(event.message || "Tasks Vision worker error");
            if (this.workerInitializationReject) {
                this.rejectWorkerInitialization(error);
            } else {
                this.startRecovery(error);
            }
        };

        const initializationPromise = new Promise<void>((resolve, reject) => {
            this.workerInitializationResolve = resolve;
            this.workerInitializationReject = reject;
            this.workerInitializationTimeout = setTimeout(() => {
                this.rejectWorkerInitialization(new Error("Tasks Vision worker initialization timed out"));
            }, WORKER_INITIALIZATION_TIMEOUT_MS);
        });

        const baseUrl = document.baseURI;
        try {
            this.postToWorker({
                type: "initialize",
                config: {
                    ...this.config,
                    backgroundImage: this.resolveDocumentUrl(this.config.backgroundImage),
                },
                modelPath: new URL("./static/tasksVision/selfie_segmenter.tflite", baseUrl).href,
            });
        } catch (error) {
            this.rejectWorkerInitialization(error instanceof Error ? error : new Error(String(error)));
        }

        await initializationPromise;
    }

    private resolveWorkerInitialization(): void {
        this.clearWorkerInitializationTimeout();
        this.workerInitializationResolve?.();
        this.workerInitializationResolve = null;
        this.workerInitializationReject = null;
    }

    private rejectWorkerInitialization(error: Error): void {
        this.clearWorkerInitializationTimeout();
        this.workerInitializationReject?.(error);
        this.workerInitializationResolve = null;
        this.workerInitializationReject = null;
    }

    private clearWorkerInitializationTimeout(): void {
        if (this.workerInitializationTimeout) {
            clearTimeout(this.workerInitializationTimeout);
            this.workerInitializationTimeout = null;
        }
    }

    private handleWorkerMessage(message: TasksVisionWorkerResponse): void {
        if (message.type === "ready") {
            this.workerDelegate = message.delegate;
            console.info(`[MediaPipe Tasks Vision] Worker initialized successfully with ${message.delegate}`);
            this.resolveWorkerInitialization();
            return;
        }
        if (message.type === "unsupported") {
            this.rejectWorkerInitialization(new UnsupportedTasksVisionWorkerError(message.reason));
            return;
        }
        if (message.type === "initialization-error") {
            this.rejectWorkerInitialization(deserializeError(message.error));
            return;
        }
        if (message.type === "config-updated" || message.type === "config-update-error") {
            this.handleConfigResponse(message);
            return;
        }
        if (message.type === "frame") {
            this.handleProcessedFrame(message);
            return;
        }

        this.handleFrameError(message);
    }

    private handleConfigResponse(
        message: Extract<TasksVisionWorkerResponse, { type: "config-updated" | "config-update-error" }>,
    ): void {
        const request = this.takePendingConfigRequest(message.requestId);
        if (!request) {
            return;
        }
        if (message.type === "config-updated") {
            request.resolve();
        } else {
            request.reject(deserializeError(message.error));
        }
    }

    private handleProcessedFrame(message: Extract<TasksVisionWorkerResponse, { type: "frame" }>): void {
        if (message.frameId !== this.activeFrameId) {
            message.bitmap.close();
            return;
        }

        const frameGeneration = this.activeFrameGeneration;
        this.frameInFlight = false;
        this.activeFrameId = null;

        if (!this.closed && frameGeneration === this.streamGeneration) {
            this.outputContext.drawImage(message.bitmap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
            this.blurBackend = message.blurBackend;
            this.frameCount++;
            this.markSuccessfulFrame();
            if (this.pendingInitialFrame?.generation === frameGeneration) {
                this.pendingInitialFrame.resolve();
                this.pendingInitialFrame = null;
            }
        }
        message.bitmap.close();

        if (this.processingEnabled) {
            this.scheduleNextFrame();
        }
    }

    private handleFrameError(message: Extract<TasksVisionWorkerResponse, { type: "frame-error" }>): void {
        if (message.frameId !== this.activeFrameId) {
            return;
        }
        this.frameInFlight = false;
        this.activeFrameId = null;
        const error = deserializeError(message.error);
        console.error(
            `[MediaPipe Tasks Vision] Worker frame processing failed: ${error.name}: ${error.message}; ` +
                `timestampMs=${this.lastTimestampMs}; videoTime=${this.inputVideo.currentTime}; ` +
                `readyState=${this.inputVideo.readyState}; visibility=${document.visibilityState}; ` +
                `webGlContextLost=${message.webGlContextLost}`,
        );
        this.startRecovery(error);
    }

    private processFrame(): void {
        if (
            this.closed ||
            !this.processingEnabled ||
            !this.worker ||
            !this.outputStream ||
            this.config.mode === "none" ||
            this.frameInFlight
        ) {
            return;
        }
        if (
            !this.outputCanvas.width ||
            !this.outputCanvas.height ||
            !this.inputVideo.videoWidth ||
            !this.inputVideo.videoHeight ||
            this.inputVideo.readyState < 2
        ) {
            this.scheduleNextFrame();
            return;
        }

        this.frameInFlight = true;
        const frameGeneration = this.streamGeneration;
        this.createAndPostFrame(frameGeneration).catch((error: unknown) => {
            console.error("[MediaPipe Tasks Vision] Unexpected frame transfer failure:", error);
        });
    }

    private async createAndPostFrame(frameGeneration: number): Promise<void> {
        let frame: ImageBitmap | null = null;
        let backgroundFrame: ImageBitmap | null = null;
        try {
            frame = await createImageBitmap(this.inputVideo);
            if (this.config.mode === "video" && this.backgroundVideo && this.backgroundVideo.readyState >= 2) {
                backgroundFrame = await createImageBitmap(this.backgroundVideo);
            }

            if (this.closed || !this.worker || frameGeneration !== this.streamGeneration) {
                return;
            }

            const frameId = this.nextFrameId++;
            const timestampMs = Math.max(performance.now(), this.lastTimestampMs + 1);
            this.lastTimestampMs = timestampMs;
            const message: TasksVisionWorkerRequest = {
                type: "process-frame",
                frameId,
                frame,
                backgroundFrame: backgroundFrame ?? undefined,
                timestampMs,
                width: this.outputCanvas.width,
                height: this.outputCanvas.height,
            };
            const transfer: Transferable[] = [frame];
            if (backgroundFrame) {
                transfer.push(backgroundFrame);
            }
            this.postToWorker(message, transfer);
            this.activeFrameId = frameId;
            this.activeFrameGeneration = frameGeneration;
            frame = null;
            backgroundFrame = null;
        } catch (error) {
            console.warn("[MediaPipe Tasks Vision] Failed to create or transfer a camera frame:", error);
        } finally {
            frame?.close();
            backgroundFrame?.close();
            if (this.activeFrameId === null) {
                this.frameInFlight = false;
                if (this.processingEnabled) {
                    this.scheduleNextFrame();
                }
            }
        }
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

    private startRecovery(error: unknown): void {
        if (this.closed || this.recoveryPromise) {
            return;
        }
        this.cancelScheduledFrame();
        this.recoveryPromise = this.recoverWorker()
            .catch((recoveryError: unknown) => {
                const terminalError = new Error("MediaPipe Tasks Vision worker recovery failed", {
                    cause: recoveryError,
                });
                console.error("[MediaPipe Tasks Vision] Worker recovery failed:", recoveryError, error);
                this.close();
                try {
                    this.onTerminalFailure?.(terminalError);
                } catch (callbackError) {
                    console.error("[MediaPipe Tasks Vision] Terminal failure handler failed:", callbackError);
                }
            })
            .finally(() => {
                this.recoveryPromise = null;
            });
    }

    private async recoverWorker(): Promise<void> {
        if (this.closed || this.consecutiveRecoveryAttempts >= MAX_CONSECUTIVE_RECOVERY_ATTEMPTS) {
            throw new Error("MediaPipe worker recovery attempts exhausted");
        }

        this.consecutiveRecoveryAttempts++;
        this.successfulFramesSinceRecovery = 0;
        this.frameInFlight = false;
        this.activeFrameId = null;
        this.terminateWorker();

        try {
            await this.startWorker();
        } catch (error) {
            if (this.consecutiveRecoveryAttempts >= MAX_CONSECUTIVE_RECOVERY_ATTEMPTS) {
                throw error;
            }
            return this.recoverWorker();
        }

        if (this.closed) {
            this.terminateWorker();
            return;
        }
        console.info(
            `[MediaPipe Tasks Vision] Worker recovered after attempt ${this.consecutiveRecoveryAttempts}/${MAX_CONSECUTIVE_RECOVERY_ATTEMPTS}`,
        );
        if (this.processingEnabled) {
            this.scheduleNextFrame();
        }
    }

    public async waitForInitialization(): Promise<void> {
        await this.initPromise;
    }

    public async updateConfig(nextConfig: Partial<BackgroundConfig>): Promise<void> {
        Object.assign(this.config, nextConfig);
        await this.initPromise;
        if (this.fallback) {
            await this.fallback.updateConfig(nextConfig);
            return;
        }
        if (this.recoveryPromise) {
            await this.recoveryPromise;
        }

        await this.updateBackgroundVideo();
        const requestId = this.nextConfigRequestId++;
        const responsePromise = new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const request = this.takePendingConfigRequest(requestId);
                if (!request) {
                    return;
                }
                const error = new Error(`Tasks Vision worker config update ${requestId} timed out`);
                request.reject(error);
                this.startRecovery(error);
            }, CONFIG_UPDATE_TIMEOUT_MS);
            this.pendingConfigRequests.set(requestId, { resolve, reject, timeoutId });
        });
        const workerConfig = { ...nextConfig };
        if (nextConfig.backgroundImage !== undefined) {
            workerConfig.backgroundImage = this.resolveDocumentUrl(nextConfig.backgroundImage);
        }
        try {
            this.postToWorker({
                type: "update-config",
                requestId,
                config: workerConfig,
            });
        } catch (error) {
            this.takePendingConfigRequest(requestId)?.reject(error instanceof Error ? error : new Error(String(error)));
        }
        await responsePromise;

        if (this.config.mode === "none") {
            this.cancelScheduledFrame();
        } else if (this.outputStream && this.processingEnabled && !this.frameInFlight) {
            this.processFrame();
        }
    }

    private async updateBackgroundVideo(): Promise<void> {
        const nextUrl = this.config.mode === "video" ? this.config.backgroundVideo : undefined;
        if (nextUrl === this.backgroundVideoUrl) {
            return;
        }

        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = "";
            this.backgroundVideo = null;
        }
        this.backgroundVideoUrl = null;

        if (!nextUrl) {
            return;
        }

        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.src = nextUrl;
        await video.play();
        this.backgroundVideo = video;
        this.backgroundVideoUrl = nextUrl;
    }

    private resolveDocumentUrl(url: string | undefined): string | undefined {
        return url ? new URL(url, document.baseURI).href : undefined;
    }

    private takePendingConfigRequest(requestId: number): PendingConfigRequest | undefined {
        const request = this.pendingConfigRequests.get(requestId);
        if (!request) {
            return undefined;
        }
        this.pendingConfigRequests.delete(requestId);
        clearTimeout(request.timeoutId);
        return request;
    }

    public getPerformanceStats(): unknown {
        if (this.fallback) {
            return this.fallback.getPerformanceStats();
        }
        const elapsed = performance.now() - this.startTime;
        const fps = this.frameCount > 0 && elapsed > 0 ? Math.round((this.frameCount / elapsed) * 1000) : 0;
        return {
            fps,
            frameCount: this.frameCount,
            elapsed: Math.round(elapsed),
            closed: this.closed,
            blurBackend: this.config.mode === "blur" ? this.blurBackend : "none",
            captureBackend: "worker-2d-copy-capture",
            workerDelegate: this.workerDelegate,
        };
    }

    public stop(): void {
        if (this.fallback) {
            this.fallback.stop();
            return;
        }
        this.processingEnabled = false;
        this.cancelScheduledFrame();
        this.rejectPendingInitialFrame(new AbortError("Tasks Vision processing stopped before its first frame"));
    }

    public close(): void {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.processingEnabled = false;
        this.cancelScheduledFrame();
        this.rejectPendingInitialFrame(new Error("Tasks Vision transformer closed before its first frame"));
        this.fallback?.close();
        this.fallback = null;
        this.terminateWorker();

        if (this.outputStream) {
            for (const track of this.outputStream.getVideoTracks()) {
                track.stop();
            }
            this.outputStream = null;
        }
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = "";
            this.backgroundVideo = null;
        }
        this.inputVideo.pause();
        this.inputVideo.srcObject = null;
    }

    private terminateWorker(): void {
        if (this.workerInitializationReject) {
            this.rejectWorkerInitialization(new Error("Tasks Vision worker was terminated during initialization"));
        } else {
            this.clearWorkerInitializationTimeout();
        }
        this.worker?.terminate();
        this.worker = null;
        this.workerDelegate = "none";
        const error = new Error("Tasks Vision worker was terminated");
        for (const request of this.pendingConfigRequests.values()) {
            clearTimeout(request.timeoutId);
            request.reject(error);
        }
        this.pendingConfigRequests.clear();
    }

    public async transform(inputStream: MediaStream, signal?: AbortSignal): Promise<MediaStream> {
        await this.initPromise;
        if (this.fallback) {
            return this.fallback.transform(inputStream, signal);
        }
        if (this.recoveryPromise) {
            await raceAbort(this.recoveryPromise, signal);
        }
        if (signal?.aborted) {
            throw signal.reason ?? new AbortError("Transform aborted after worker initialization");
        }
        if (this.config.mode === "none") {
            return inputStream;
        }

        this.processingEnabled = false;
        this.cancelScheduledFrame();
        this.rejectPendingInitialFrame(new AbortError("Tasks Vision transform was superseded"));
        this.streamGeneration++;
        this.inputVideo.srcObject = inputStream;

        const loadedMetadataPromise = new Promise<void>((resolve) => {
            if (this.inputVideo.readyState >= 2) {
                resolve();
            } else {
                this.inputVideo.addEventListener("loadedmetadata", () => resolve(), { once: true });
            }
        });
        await raceAbort(loadedMetadataPromise, signal);
        await raceAbort(this.inputVideo.play(), signal);
        if (signal?.aborted) {
            throw signal.reason ?? new AbortError("Transform aborted while starting video playback");
        }

        const videoWidth = this.inputVideo.videoWidth;
        const videoHeight = this.inputVideo.videoHeight;
        if (!videoWidth || !videoHeight) {
            throw new Error(
                `[MediaPipe Tasks Vision] Invalid video dimensions: ${videoWidth}x${videoHeight}. Cannot process stream.`,
            );
        }

        this.frameRate = inputStream.getVideoTracks()[0]?.getSettings().frameRate || DEFAULT_FRAME_RATE;
        this.frameIntervalMs = 1000 / this.frameRate;
        this.outputCanvas.width = videoWidth;
        this.outputCanvas.height = videoHeight;

        if (this.outputStream) {
            for (const track of this.outputStream.getVideoTracks()) {
                track.stop();
            }
        }
        const outputStream = this.outputCanvas.captureStream(this.frameRate);
        this.outputStream = outputStream;
        for (const audioTrack of inputStream.getAudioTracks()) {
            outputStream.addTrack(audioTrack);
        }

        this.processingEnabled = true;
        const initialFramePromise = new Promise<void>((resolve, reject) => {
            this.pendingInitialFrame = { generation: this.streamGeneration, resolve, reject };
        });
        if (!this.frameInFlight) {
            this.processFrame();
        }
        try {
            await raceAbort(initialFramePromise, signal);
        } catch (error) {
            if (this.pendingInitialFrame?.generation === this.streamGeneration) {
                this.pendingInitialFrame = null;
            }
            throw error;
        }
        return outputStream;
    }

    private rejectPendingInitialFrame(error: Error): void {
        this.pendingInitialFrame?.reject(error);
        this.pendingInitialFrame = null;
    }

    private postToWorker(message: TasksVisionWorkerRequest, transfer?: Transferable[]): void {
        if (!this.worker) {
            throw new Error("Tasks Vision worker is unavailable");
        }
        this.worker.postMessage(message, transfer ?? []);
    }
}
