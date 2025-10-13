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

        close(): void;
    }
}
