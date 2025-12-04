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

    // ImageSource type (compatible with TexImageSource)
    export type ImageSource =
        | HTMLCanvasElement
        | HTMLImageElement
        | HTMLVideoElement
        | ImageBitmap
        | OffscreenCanvas
        | VideoFrame;

    // RGBA color as a 4-element array [r, g, b, a] where values are 0-255
    export type RGBAColor = [number, number, number, number] | number[];

    // DrawingUtils class for rendering masks and overlays
    export class DrawingUtils {
        constructor(gpuContext: WebGL2RenderingContext);
        constructor(
            cpuContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
            gpuContext?: WebGL2RenderingContext
        );

        /**
         * Blends two images using the provided confidence mask.
         * @param mask A confidence mask returned from a segmentation task
         * @param defaultTexture Image or color used where confidence is low
         * @param overlayTexture Image or color used where confidence is high
         */
        drawConfidenceMask(
            mask: MPMask,
            defaultTexture: RGBAColor | ImageSource,
            overlayTexture: RGBAColor | ImageSource
        ): void;

        /**
         * Draws a category mask using the provided category-to-color mapping.
         */
        drawCategoryMask(
            mask: MPMask,
            categoryToColorMap: Map<number, RGBAColor> | RGBAColor[],
            background?: RGBAColor | ImageSource
        ): void;

        close(): void;
    }
}
