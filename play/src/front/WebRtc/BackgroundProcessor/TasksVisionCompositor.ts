import type { MPMask } from "@mediapipe/tasks-vision";
import { logOnce } from "./logOnce";
import { WebGlBlurPipeline } from "./WebGlBlurPipeline";

/**
 * Composites a camera frame with a MediaPipe confidence mask on the WebGL context MediaPipe renders on,
 * so the mask texture is used in place without any readback.
 */
export class TasksVisionCompositor {
    private readonly pipeline: WebGlBlurPipeline;
    private unavailable = false;

    constructor(
        private readonly gl: WebGL2RenderingContext,
        canvas: HTMLCanvasElement | OffscreenCanvas,
    ) {
        this.pipeline = new WebGlBlurPipeline({ canvas, gl });
    }

    public drawBlur(
        source: CanvasImageSource,
        mask: MPMask,
        width: number,
        height: number,
        blurAmount: number,
        freshMask: boolean,
    ): boolean {
        return this.run(mask, width, height, (maskTexture) =>
            this.pipeline.drawBlur(source, maskTexture, width, height, blurAmount, freshMask),
        );
    }

    public drawReplace(
        source: CanvasImageSource,
        mask: MPMask,
        background: CanvasImageSource | null,
        width: number,
        height: number,
        freshMask: boolean,
    ): boolean {
        return this.run(mask, width, height, (maskTexture) =>
            this.pipeline.drawReplace(source, maskTexture, background, width, height, freshMask),
        );
    }

    private run(mask: MPMask, width: number, height: number, draw: (maskTexture: WebGLTexture) => boolean): boolean {
        if (this.unavailable || width <= 0 || height <= 0 || this.gl.isContextLost()) {
            return false;
        }
        if (mask.canvas && mask.canvas !== this.gl.canvas) {
            return false;
        }
        try {
            const success = draw(mask.getAsWebGLTexture());
            if (success) {
                logOnce("tasks-vision-compositor:selected", () =>
                    console.info("[BackgroundProcessor] Using the WebGL background compositor."),
                );
            }
            return success;
        } catch (error) {
            if (!this.gl.isContextLost()) {
                this.unavailable = true;
                this.pipeline.close();
            }
            logOnce("tasks-vision-compositor:failure", () =>
                console.warn("[BackgroundProcessor] WebGL background compositor failed.", error),
            );
            return false;
        }
    }

    public close(): void {
        this.pipeline.close();
    }
}
