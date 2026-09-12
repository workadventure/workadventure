import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workerMocks = vi.hoisted(
    (): {
        instances: Array<{
            onmessage: ((event: MessageEvent) => void) | null;
            messages: Array<{ type: string; requestId?: number; config?: { backgroundImage?: string } }>;
            url: string | URL;
            options?: WorkerOptions;
            response: "ready" | "unsupported";
            terminate: ReturnType<typeof vi.fn>;
        }>;
        response: "ready" | "unsupported";
        respondToConfigUpdates: boolean;
    } => ({
        instances: [],
        response: "ready",
        respondToConfigUpdates: true,
    }),
);

const fallbackMocks = vi.hoisted(() => ({
    close: vi.fn(),
    getPerformanceStats: vi.fn(() => ({ captureBackend: "main-thread-fallback" })),
    stop: vi.fn(),
    transform: vi.fn(),
    updateConfig: vi.fn().mockResolvedValue(undefined),
    waitForInitialization: vi.fn().mockResolvedValue(undefined),
    constructor: vi.fn(),
}));

vi.mock("../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionWorker?worker&url", () => ({
    default: "/assets/tasks-vision-worker.js",
}));

vi.mock("../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionTransformer", () => ({
    MediaPipeTasksVisionTransformer: class {
        public close = fallbackMocks.close;
        public getPerformanceStats = fallbackMocks.getPerformanceStats;
        public stop = fallbackMocks.stop;
        public transform = fallbackMocks.transform;
        public updateConfig = fallbackMocks.updateConfig;
        public waitForInitialization = fallbackMocks.waitForInitialization;

        constructor(config: unknown, onTerminalFailure: unknown) {
            fallbackMocks.constructor(config, onTerminalFailure);
        }
    },
}));

import { MediaPipeTasksVisionWorkerTransformer } from "../../../../src/front/WebRtc/BackgroundProcessor/MediaPipeTasksVisionWorkerTransformer";

describe("MediaPipeTasksVisionWorkerTransformer", () => {
    let transformer: MediaPipeTasksVisionWorkerTransformer | undefined;

    beforeEach(() => {
        workerMocks.response = "ready";
        workerMocks.respondToConfigUpdates = true;
        workerMocks.instances.length = 0;
        vi.stubGlobal(
            "Worker",
            class {
                public onmessage: ((event: MessageEvent) => void) | null = null;
                public onerror: ((event: ErrorEvent) => void) | null = null;
                public messages: Array<{
                    type: string;
                    requestId?: number;
                    config?: { backgroundImage?: string };
                }> = [];
                public response = workerMocks.response;
                public terminate = vi.fn();

                constructor(
                    public url: string | URL,
                    public options?: WorkerOptions,
                ) {
                    workerMocks.instances.push(this);
                }

                public postMessage(message: {
                    type: string;
                    requestId?: number;
                    config?: { backgroundImage?: string };
                }): void {
                    this.messages.push(message);
                    if (message.type === "update-config") {
                        if (!workerMocks.respondToConfigUpdates) {
                            return;
                        }
                        queueMicrotask(() => {
                            this.onmessage?.({
                                data: { type: "config-updated", requestId: message.requestId },
                            } as MessageEvent);
                        });
                        return;
                    }
                    if (message.type !== "initialize") {
                        return;
                    }
                    queueMicrotask(() => {
                        const data =
                            this.response === "ready"
                                ? { type: "ready", delegate: "GPU" }
                                : {
                                      type: "unsupported",
                                      reason: "WebGL2 is unavailable in OffscreenCanvas workers",
                                  };
                        this.onmessage?.({ data } as MessageEvent);
                    });
                }
            },
        );
        vi.stubGlobal("OffscreenCanvas", class {});
        vi.stubGlobal("createImageBitmap", vi.fn());
        vi.spyOn(console, "info").mockImplementation(() => undefined);

        const outputContext = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
        const outputCanvas = {
            getContext: vi.fn(() => outputContext),
        } as unknown as HTMLCanvasElement;
        const inputVideo = {
            pause: vi.fn(),
            srcObject: null,
        } as unknown as HTMLVideoElement;
        vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
            if (tagName === "canvas") {
                return outputCanvas;
            }
            if (tagName === "video") {
                return inputVideo;
            }
            throw new Error(`Unexpected element requested by test: ${tagName}`);
        });
    });

    afterEach(() => {
        transformer?.close();
        transformer = undefined;
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        fallbackMocks.close.mockReset();
        fallbackMocks.getPerformanceStats.mockClear();
        fallbackMocks.stop.mockReset();
        fallbackMocks.transform.mockReset();
        fallbackMocks.updateConfig.mockClear();
        fallbackMocks.waitForInitialization.mockClear();
        fallbackMocks.constructor.mockReset();
    });

    it("uses the worker after its WebGL2 initialization succeeds", async () => {
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" });

        await transformer.waitForInitialization();

        expect(workerMocks.instances).toHaveLength(1);
        expect(workerMocks.instances[0]).toMatchObject({
            url: "/assets/tasks-vision-worker.js",
            options: { type: "module" },
        });
        expect(fallbackMocks.constructor).not.toHaveBeenCalled();
        expect(transformer.getPerformanceStats()).toMatchObject({
            captureBackend: "worker-2d-copy-capture",
            workerDelegate: "GPU",
        });
    });

    it("uses the removable Safari 16 fallback when worker WebGL2 is unavailable", async () => {
        workerMocks.response = "unsupported";
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur", blurAmount: 12 });

        await transformer.waitForInitialization();

        expect(workerMocks.instances).toHaveLength(1);
        expect(workerMocks.instances[0].terminate).toHaveBeenCalledOnce();
        expect(fallbackMocks.constructor).toHaveBeenCalledWith({ mode: "blur", blurAmount: 12 }, undefined);
        expect(transformer.getPerformanceStats()).toEqual({ captureBackend: "main-thread-fallback" });
    });

    it("resolves relative background image URLs against the document before sending them to the worker", async () => {
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" });
        await transformer.waitForInitialization();

        await transformer.updateConfig({
            mode: "image",
            backgroundImage: "./static/images/background/library.jpg",
        });

        expect(workerMocks.instances[0].messages[1]).toMatchObject({
            type: "update-config",
            config: {
                backgroundImage: new URL("./static/images/background/library.jpg", document.baseURI).href,
            },
        });
    });

    it("rejects a stalled config update and recovers the worker", async () => {
        transformer = new MediaPipeTasksVisionWorkerTransformer({ mode: "blur" });
        await transformer.waitForInitialization();
        vi.useFakeTimers();
        workerMocks.respondToConfigUpdates = false;

        const updatePromise = transformer.updateConfig({ blurAmount: 25 });
        const updateRejection = expect(updatePromise).rejects.toThrow("Tasks Vision worker config update 1 timed out");
        await vi.advanceTimersByTimeAsync(30_000);

        await updateRejection;
        expect(workerMocks.instances[0].terminate).toHaveBeenCalledOnce();
        expect(workerMocks.instances).toHaveLength(2);
    });
});
