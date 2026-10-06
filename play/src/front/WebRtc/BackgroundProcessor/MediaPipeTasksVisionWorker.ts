import { MediaPipeTasksVisionWorkerRuntime } from "./MediaPipeTasksVisionWorkerRuntime";
import type { TasksVisionWorkerRequest, TasksVisionWorkerResponse } from "./MediaPipeTasksVisionWorkerProtocol";

const runtime = new MediaPipeTasksVisionWorkerRuntime((message: TasksVisionWorkerResponse, transfer?: Transferable[]) =>
    self.postMessage(message, { transfer }),
);

self.onmessage = (event: MessageEvent<TasksVisionWorkerRequest>): void => {
    runtime.handleMessage(event.data);
};
