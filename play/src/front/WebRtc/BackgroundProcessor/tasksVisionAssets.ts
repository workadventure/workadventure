import { FilesetResolver, type ImageSegmenter } from "@mediapipe/tasks-vision";
// The wasm, its loader and the model are imported as vite assets: they are emitted under /assets with a content
// hash, so a @mediapipe/tasks-vision bump can never be served a stale copy from the CDN edge, and nothing is
// committed to the repository.
import simdLoaderUrl from "@mediapipe/tasks-vision/vision_wasm_internal.js?url";
import simdBinaryUrl from "@mediapipe/tasks-vision/vision_wasm_internal.wasm?url";
import nosimdLoaderUrl from "@mediapipe/tasks-vision/vision_wasm_nosimd_internal.js?url";
import nosimdBinaryUrl from "@mediapipe/tasks-vision/vision_wasm_nosimd_internal.wasm?url";
import selfieSegmenterModelUrl from "./models/selfie_segmenter.tflite?url";

export type TasksVisionFileset = Parameters<typeof ImageSegmenter.createFromOptions>[0];

export const SELFIE_SEGMENTER_MODEL_URL: string = selfieSegmenterModelUrl;

/**
 * Same selection FilesetResolver.forVisionTasks() makes, but with vite-hashed asset URLs.
 */
export async function resolveTasksVisionFileset(): Promise<TasksVisionFileset> {
    return (await FilesetResolver.isSimdSupported())
        ? { wasmLoaderPath: simdLoaderUrl, wasmBinaryPath: simdBinaryUrl }
        : { wasmLoaderPath: nosimdLoaderUrl, wasmBinaryPath: nosimdBinaryUrl };
}
