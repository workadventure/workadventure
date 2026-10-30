import type { BackgroundConfig } from "./createBackgroundTransformer";
import type { SegmenterModel, TasksVisionAssetUrls } from "./tasksVisionAssets";

export type TasksVisionWorkerRequest =
    | { type: "initialize"; config: BackgroundConfig; assets: TasksVisionAssetUrls }
    | { type: "update-config"; requestId: number; config: Partial<BackgroundConfig> }
    /** Image-bitmap transport: one frame at a time, the main thread waits for the "frame" answer. */
    | { type: "process-frame"; frameId: number; frame: ImageBitmap; timestampMs: number }
    /** Insertable-streams transport: both streams are transferred, the worker pipes frames until "stop-stream". */
    | {
          type: "start-stream";
          streamId: number;
          readable: ReadableStream<VideoFrame>;
          writable: WritableStream<VideoFrame>;
      }
    | { type: "stop-stream"; streamId: number };

export type SerializedWorkerError = {
    name: string;
    message: string;
    stack?: string;
    cause?: SerializedWorkerError;
};

// Sentry's linked-errors integration reads at most 5 causes.
const MAX_SERIALIZED_CAUSES = 5;

/** Error objects lose their `cause` in postMessage: the chain is copied by hand so Sentry can show it. */
export function serializeError(error: unknown, depth = 0): SerializedWorkerError {
    if (!(error instanceof Error)) {
        return { name: "Error", message: String(error) };
    }
    const serialized: SerializedWorkerError = { name: error.name, message: error.message, stack: error.stack };
    if (error.cause !== undefined && depth < MAX_SERIALIZED_CAUSES) {
        serialized.cause = serializeError(error.cause, depth + 1);
    }
    return serialized;
}

export function deserializeError(error: SerializedWorkerError): Error {
    const deserialized = new Error(error.message, error.cause ? { cause: deserializeError(error.cause) } : undefined);
    deserialized.name = error.name;
    deserialized.stack = error.stack;
    return deserialized;
}

export type TasksVisionWorkerDelegate = "GPU" | "CPU";

/** Performance of the pipeline over the last sampling window, posted by the worker every 15 s of rendering. */
export type TasksVisionWorkerStats = {
    type: "stats";
    delegate: TasksVisionWorkerDelegate;
    model: SegmenterModel;
    meanSegmentationMs: number;
    fps: number;
    resegmentInterval: number;
};

export type TasksVisionWorkerResponse =
    | { type: "ready"; delegate: TasksVisionWorkerDelegate }
    | { type: "unsupported"; reason: string }
    | { type: "initialization-error"; error: SerializedWorkerError }
    | { type: "config-updated"; requestId: number }
    | { type: "config-update-error"; requestId: number; error: SerializedWorkerError }
    /** The answer to "process-frame". The bitmap is the input frame itself when nothing could be rendered. */
    | { type: "frame"; frameId: number; bitmap: ImageBitmap }
    | TasksVisionWorkerStats
    /** An insertable-streams pipe broke. Only that pipe is gone: the worker itself is still usable. */
    | { type: "stream-failed"; streamId: number; error: SerializedWorkerError }
    /** MediaPipe recovery failed; the worker is no longer usable. */
    | { type: "fatal"; error: SerializedWorkerError };
