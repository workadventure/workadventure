import type { MPMask } from "@mediapipe/tasks-vision";
import { WebGlBlurPipeline } from "./WebGlBlurPipeline";

let loggedSelectedBackend = false;
let loggedFailure = false;

function logSelectedBackend(): void {
    if (loggedSelectedBackend) {
        return;
    }

    loggedSelectedBackend = true;
    console.info("[BackgroundProcessor] Using WebGL background blur compositor.");
}

function logFailure(error: unknown): void {
    if (loggedFailure) {
        return;
    }

    loggedFailure = true;
    console.warn("[BackgroundProcessor] WebGL background blur compositor failed; using fallback.", error);
}

export class TasksVisionBlurCompositor {
    private readonly pipeline: WebGlBlurPipeline;
    private unavailable = false;

    constructor(
        private readonly gl: WebGL2RenderingContext,
        canvas: HTMLCanvasElement,
    ) {
        this.pipeline = new WebGlBlurPipeline({ canvas, gl, restoreState: true });
    }

    public draw(source: CanvasImageSource, mask: MPMask, width: number, height: number, blurAmount: number): boolean {
        if (this.unavailable || !width || !height || width <= 0 || height <= 0 || this.gl.isContextLost()) {
            return false;
        }

        if (mask.canvas && mask.canvas !== this.gl.canvas) {
            return false;
        }

        try {
            const success = this.pipeline.drawCompositeWithTextureMask(
                source,
                mask.getAsWebGLTexture(),
                width,
                height,
                blurAmount,
            );

            if (success) {
                logSelectedBackend();
            }

            return success;
        } catch (error) {
            if (!this.gl.isContextLost()) {
                this.unavailable = true;
                this.pipeline.close();
            }
            logFailure(error);
            return false;
        }
    }

    public close(): void {
        this.pipeline.close();
    }
}
