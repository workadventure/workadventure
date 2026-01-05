// TODO: remove this MediaPipe Tasks Vision API is stable enough (this is the types for the old @mediapipe/selfie_segmentation package)
// TODO: don't forget to remove the package from package.json as well
declare module "@mediapipe/selfie_segmentation" {
    export interface SelfieSegmentationOptions {
        locateFile?: (file: string) => string;
    }

    export interface SelfieSegmentationResults {
        image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
        segmentationMask: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
    }

    export class SelfieSegmentation {
        constructor(options?: SelfieSegmentationOptions);

        setOptions(options: { modelSelection?: number; selfieMode?: boolean }): void;

        onResults(callback: (results: SelfieSegmentationResults) => void): void;

        send(options: { image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement }): Promise<void>;

        close(): void;
    }
}
