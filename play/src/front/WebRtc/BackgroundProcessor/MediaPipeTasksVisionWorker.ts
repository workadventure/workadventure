import type { MPMask } from "@mediapipe/tasks-vision";
import { DrawingUtils, ImageSegmenter } from "@mediapipe/tasks-vision";
// This worker is emitted as a classic script, and MediaPipe loads this file with importScripts().
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_internal.wasm?url";
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_internal.js?url";
import { TasksVisionBlurCompositor } from "./TasksVisionBlurCompositor";
import type {
    SerializedWorkerError,
    TasksVisionWorkerFrame,
    TasksVisionWorkerRequest,
    TasksVisionWorkerResponse,
} from "./MediaPipeTasksVisionWorkerProtocol";
import type { BackgroundConfig } from "./createBackgroundTransformer";

interface WorkerScope {
    onmessage: ((event: MessageEvent<TasksVisionWorkerRequest>) => void) | null;
    postMessage(message: TasksVisionWorkerResponse, transfer?: Transferable[]): void;
}

const workerScope = self as unknown as WorkerScope;

let config: BackgroundConfig = { mode: "none" };
let glCanvas: OffscreenCanvas | null = null;
let gl: WebGL2RenderingContext | null = null;
let imageSegmenter: ImageSegmenter | null = null;
let drawingUtils: DrawingUtils | null = null;
let blurCompositor: TasksVisionBlurCompositor | null = null;
let backgroundImage: ImageBitmap | null = null;
let backgroundImageUrl: string | null = null;
let backgroundCanvas: OffscreenCanvas | null = null;
let backgroundCanvasContext: OffscreenCanvasRenderingContext2D | null = null;
let fallbackBlurredCanvas: OffscreenCanvas | null = null;
let fallbackBlurredContext: OffscreenCanvasRenderingContext2D | null = null;

function serializeError(error: unknown): SerializedWorkerError {
    if (error instanceof Error) {
        return { name: error.name, message: error.message, stack: error.stack };
    }
    return { name: "Error", message: String(error) };
}

function postMessage(message: TasksVisionWorkerResponse, transfer?: Transferable[]): void {
    workerScope.postMessage(message, transfer);
}

async function initialize(workerConfig: BackgroundConfig, modelPath: string): Promise<void> {
    if (typeof OffscreenCanvas === "undefined") {
        postMessage({ type: "unsupported", reason: "OffscreenCanvas is unavailable" });
        return;
    }

    glCanvas = new OffscreenCanvas(1, 1);
    gl = glCanvas.getContext("webgl2");
    if (!gl) {
        postMessage({ type: "unsupported", reason: "WebGL2 is unavailable in OffscreenCanvas workers" });
        return;
    }

    config = { ...workerConfig };

    try {
        const filesetResolver = { wasmLoaderPath, wasmBinaryPath };
        let delegate: "GPU" | "CPU" = "GPU";

        try {
            imageSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
                baseOptions: { modelAssetPath: modelPath, delegate: "GPU" },
                canvas: glCanvas,
                runningMode: "VIDEO",
                outputCategoryMask: false,
                outputConfidenceMasks: true,
            });
        } catch (gpuError) {
            console.warn("[MediaPipe Tasks Vision Worker] GPU initialization failed, using CPU:", gpuError);
            delegate = "CPU";
            imageSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
                baseOptions: { modelAssetPath: modelPath, delegate: "CPU" },
                canvas: glCanvas,
                runningMode: "VIDEO",
                outputCategoryMask: false,
                outputConfidenceMasks: true,
            });
        }

        drawingUtils = new DrawingUtils(gl);
        blurCompositor = new TasksVisionBlurCompositor(gl, glCanvas);
        await updateBackgroundImage();
        postMessage({ type: "ready", delegate });
    } catch (error) {
        dispose();
        postMessage({ type: "initialization-error", error: serializeError(error) });
    }
}

async function updateBackgroundImage(): Promise<void> {
    const nextUrl = config.mode === "image" ? config.backgroundImage : undefined;
    if (nextUrl === backgroundImageUrl) {
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

    backgroundImage?.close();
    backgroundImage = nextBackgroundImage;
    // Worker requests are serialized through messageQueue, so this cannot race another update.
    // eslint-disable-next-line require-atomic-updates
    backgroundImageUrl = nextUrl ?? null;
    backgroundCanvas = null;
    backgroundCanvasContext = null;
}

async function updateConfig(requestId: number, nextConfig: Partial<BackgroundConfig>): Promise<void> {
    try {
        Object.assign(config, nextConfig);
        await updateBackgroundImage();
        postMessage({ type: "config-updated", requestId });
    } catch (error) {
        postMessage({ type: "config-update-error", requestId, error: serializeError(error) });
    }
}

function processFrame(message: TasksVisionWorkerFrame): void {
    const { frame, backgroundFrame, frameId, timestampMs, width, height } = message;
    let frameTransferred = false;

    try {
        if (!imageSegmenter || !glCanvas || !gl) {
            throw new Error("MediaPipe worker received a frame before initialization");
        }
        const activeCanvas = glCanvas;
        const activeGl = gl;

        if (activeCanvas.width !== width || activeCanvas.height !== height) {
            activeCanvas.width = width;
            activeCanvas.height = height;
        }

        let outputBitmap: ImageBitmap | null = null;
        let blurBackend: "webgl-blur" | "none" = "none";

        imageSegmenter.segmentForVideo(frame, timestampMs, (result) => {
            const mask = result.confidenceMasks?.[0];
            if (!mask) {
                return;
            }

            blurBackend = renderFrame(frame, backgroundFrame, mask, width, height);
            activeGl.flush();
            outputBitmap = activeCanvas.transferToImageBitmap();
        });

        if (!outputBitmap) {
            outputBitmap = frame;
            frameTransferred = true;
        }

        postMessage({ type: "frame", frameId, bitmap: outputBitmap, blurBackend }, [outputBitmap]);
    } catch (error) {
        postMessage({
            type: "frame-error",
            frameId,
            error: serializeError(error),
            webGlContextLost: gl?.isContextLost() ?? true,
        });
    } finally {
        if (!frameTransferred) {
            frame.close();
        }
        backgroundFrame?.close();
    }
}

function renderFrame(
    frame: ImageBitmap,
    backgroundFrame: ImageBitmap | undefined,
    mask: MPMask,
    width: number,
    height: number,
): "webgl-blur" | "none" {
    if (!drawingUtils) {
        throw new Error("DrawingUtils is unavailable");
    }

    if (config.mode === "blur") {
        if (blurCompositor?.draw(frame, mask, width, height, config.blurAmount || 15)) {
            return "webgl-blur";
        }

        const blurredCanvas = getFallbackBlurredCanvas(width, height);
        fallbackBlurredContext!.filter = `blur(${config.blurAmount || 15}px)`;
        fallbackBlurredContext!.drawImage(frame, 0, 0, width, height);
        fallbackBlurredContext!.filter = "none";
        drawingUtils.drawConfidenceMask(mask, blurredCanvas, frame);
        return "none";
    }

    if (config.mode === "image") {
        const imageCanvas = getBackgroundCanvas(width, height);
        drawingUtils.drawConfidenceMask(mask, imageCanvas ?? [0, 0, 0, 255], frame);
        return "none";
    }

    if (config.mode === "video") {
        drawingUtils.drawConfidenceMask(mask, backgroundFrame ?? [0, 0, 0, 255], frame);
        return "none";
    }

    throw new Error(`Unsupported background mode: ${config.mode}`);
}

function getFallbackBlurredCanvas(width: number, height: number): OffscreenCanvas {
    if (!fallbackBlurredCanvas) {
        fallbackBlurredCanvas = new OffscreenCanvas(width, height);
        fallbackBlurredContext = fallbackBlurredCanvas.getContext("2d");
        if (!fallbackBlurredContext) {
            throw new Error("Unable to create fallback blur canvas");
        }
    }
    if (fallbackBlurredCanvas.width !== width || fallbackBlurredCanvas.height !== height) {
        fallbackBlurredCanvas.width = width;
        fallbackBlurredCanvas.height = height;
    }
    fallbackBlurredContext!.clearRect(0, 0, width, height);
    return fallbackBlurredCanvas;
}

function getBackgroundCanvas(width: number, height: number): OffscreenCanvas | null {
    if (!backgroundImage) {
        return null;
    }

    let needsRedraw = false;
    if (!backgroundCanvas) {
        backgroundCanvas = new OffscreenCanvas(width, height);
        backgroundCanvasContext = backgroundCanvas.getContext("2d");
        if (!backgroundCanvasContext) {
            throw new Error("Unable to create background image canvas");
        }
        needsRedraw = true;
    }

    if (backgroundCanvas.width !== width || backgroundCanvas.height !== height) {
        backgroundCanvas.width = width;
        backgroundCanvas.height = height;
        needsRedraw = true;
    }
    if (!needsRedraw) {
        return backgroundCanvas;
    }

    const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height);
    const scaledWidth = backgroundImage.width * scale;
    const scaledHeight = backgroundImage.height * scale;
    backgroundCanvasContext!.clearRect(0, 0, width, height);
    backgroundCanvasContext!.drawImage(
        backgroundImage,
        (width - scaledWidth) / 2,
        (height - scaledHeight) / 2,
        scaledWidth,
        scaledHeight,
    );
    return backgroundCanvas;
}

function closeResource(name: string, resource: { close(): void } | null): void {
    if (!resource) {
        return;
    }
    try {
        resource.close();
    } catch (error) {
        console.warn(`[MediaPipe Tasks Vision Worker] Error closing ${name}:`, error);
    }
}

function dispose(): void {
    closeResource("blur compositor", blurCompositor);
    blurCompositor = null;
    closeResource("DrawingUtils", drawingUtils);
    drawingUtils = null;
    closeResource("ImageSegmenter", imageSegmenter);
    imageSegmenter = null;
    closeResource("background image", backgroundImage);
    backgroundImage = null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    gl = null;
    glCanvas = null;
}

let messageQueue = Promise.resolve();
workerScope.onmessage = (event): void => {
    messageQueue = messageQueue
        .then(async () => {
            const message = event.data;
            if (message.type === "initialize") {
                await initialize(message.config, message.modelPath);
            } else if (message.type === "update-config") {
                await updateConfig(message.requestId, message.config);
            } else {
                processFrame(message);
            }
        })
        .catch((error: unknown) => {
            console.error("[MediaPipe Tasks Vision Worker] Unexpected worker error:", error);
        });
};
