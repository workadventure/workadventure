import type { BackgroundConfig } from "./createBackgroundTransformer";

export type TasksVisionWorkerInitialization = {
    type: "initialize";
    config: BackgroundConfig;
    modelPath: string;
};

export type TasksVisionWorkerFrame = {
    type: "process-frame";
    frameId: number;
    frame: ImageBitmap;
    backgroundFrame?: ImageBitmap;
    timestampMs: number;
    width: number;
    height: number;
};

export type TasksVisionWorkerConfigUpdate = {
    type: "update-config";
    requestId: number;
    config: Partial<BackgroundConfig>;
};

export type TasksVisionWorkerRequest =
    | TasksVisionWorkerInitialization
    | TasksVisionWorkerFrame
    | TasksVisionWorkerConfigUpdate;

export type SerializedWorkerError = {
    name: string;
    message: string;
    stack?: string;
};

export type TasksVisionWorkerResponse =
    | { type: "ready"; delegate: "GPU" | "CPU" }
    | { type: "unsupported"; reason: string }
    | { type: "initialization-error"; error: SerializedWorkerError }
    | { type: "frame"; frameId: number; bitmap: ImageBitmap; blurBackend: "webgl-blur" | "none" }
    | { type: "frame-error"; frameId: number; error: SerializedWorkerError; webGlContextLost: boolean }
    | { type: "config-updated"; requestId: number }
    | { type: "config-update-error"; requestId: number; error: SerializedWorkerError };
