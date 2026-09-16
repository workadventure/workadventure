import type { BackgroundConfig } from "./createBackgroundTransformer";
import type { SegmenterModel } from "./tasksVisionAssets";

export type TasksVisionWorkerRequest =
    | { type: "initialize"; config: BackgroundConfig }
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
};

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
    /** MediaPipe recovery failed (or the stream pipe broke); the worker is no longer usable. */
    | { type: "fatal"; error: SerializedWorkerError };
