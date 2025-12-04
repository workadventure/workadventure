declare module "@mediapipe/tasks-vision" {
    export interface BaseOptions {
        modelAssetPath?: string;
        delegate?: "CPU" | "GPU";
    }

    export interface ImageSegmenterOptions {
        baseOptions?: BaseOptions;
        runningMode?: "IMAGE" | "VIDEO";
        outputCategoryMask?: boolean;
        outputConfidenceMasks?: boolean;
        canvas?: HTMLCanvasElement;
    }

    export interface ImageSegmenterResult {
        categoryMask?: MPMask;
        confidenceMasks?: Array<MPMask>;
    }

    export interface MPMask {
        getAsWebGLTexture(): WebGLTexture | null;
        getAsFloat32Array(): Float32Array;
        getAsUint8Array(): Uint8Array;
        close(): void;
        width: number;
        height: number;
        canvas?: HTMLCanvasElement;
    }

    export class FilesetResolver {
        static forVisionTasks(path: string): Promise<FilesetResolver>;
    }

    export class ImageSegmenter {
        static createFromOptions(
            filesetResolver: FilesetResolver,
            options: ImageSegmenterOptions
        ): Promise<ImageSegmenter>;

        segmentForVideo(
            image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | VideoFrame,
            timestamp: number
        ): ImageSegmenterResult;

        segment(image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | VideoFrame): ImageSegmenterResult;

        close(): void;
    }

    /** RGBA color represented as an array of 4 numbers (0-255) */
    export type RGBAColor = [number, number, number, number];

    /** Image source types that can be used with DrawingUtils */
    export type ImageSource =
        | HTMLCanvasElement
        | HTMLImageElement
        | HTMLVideoElement
        | OffscreenCanvas
        | VideoFrame
        | ImageBitmap
        | ImageData;

    /**
     * Helper class to visualize the result of a MediaPipe Vision task.
     * Uses WebGL for GPU-accelerated rendering.
     */
    export class DrawingUtils {
        /**
         * Creates a new DrawingUtils class for WebGL-only rendering.
         * @param gpuContext The WebGL2 rendering context. If your Task is using a GPU delegate,
         *                   the context must be obtained from its canvas (provided via setOptions({ canvas: .. })).
         */
        constructor(gpuContext: WebGL2RenderingContext);

        /**
         * Creates a new DrawingUtils class for CPU+GPU rendering.
         * @param cpuContext The 2D canvas rendering context to render into.
         * @param gpuContext A WebGL canvas for GPU rendering and converting GPU to CPU data.
         */
        constructor(
            cpuContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
            gpuContext?: WebGL2RenderingContext
        );

        /**
         * Blends two images using the provided confidence mask.
         * @param mask A confidence mask that was returned from a segmentation task.
         * @param defaultTexture An image or color used when confidence values are low (background).
         * @param overlayTexture An image or color used when confidence values are high (foreground/person).
         */
        drawConfidenceMask(
            mask: MPMask,
            defaultTexture: RGBAColor | ImageSource,
            overlayTexture: RGBAColor | ImageSource
        ): void;

        /**
         * Draws a category mask using the provided category-to-color mapping.
         * @param mask A category mask that was returned from a segmentation task.
         * @param categoryToColorMap A map or array that maps category indices to RGBA values.
         * @param background A color or image to use as the background. Defaults to black.
         */
        drawCategoryMask(
            mask: MPMask,
            categoryToColorMap: Map<number, RGBAColor> | RGBAColor[],
            background?: RGBAColor | ImageSource
        ): void;

        /**
         * Frees all WebGL resources held by this class.
         */
        close(): void;

        /**
         * Restricts a number between two endpoints (order doesn't matter).
         */
        static clamp(x: number, x0: number, x1: number): number;

        /**
         * Linearly interpolates a value between two points, clamping to endpoints.
         */
        static lerp(x: number, x0: number, x1: number, y0: number, y1: number): number;
    }
}
