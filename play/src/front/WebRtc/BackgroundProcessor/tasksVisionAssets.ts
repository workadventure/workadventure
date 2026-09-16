// The wasm, its loader and the model are imported as vite assets: they are emitted under /assets with a content
// hash, so a @mediapipe/tasks-vision bump can never be served a stale copy from the CDN edge, and nothing is
// committed to the repository.
//
// The segmenter runs in a module worker, where MediaPipe loads its wasm through a dynamic import(), which needs
// the "module" flavour of the loader. That flavour only ships a SIMD build; every browser that has WebGL2 in an
// OffscreenCanvas worker (Chrome 69+, Firefox 105+, Safari 17+) also has wasm SIMD, so no nosimd fallback exists.
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_module_internal.js?url";
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url";
import selfieSegmenterModelUrl from "./models/selfie_segmenter.tflite?url";
import selfieSegmenterLandscapeModelUrl from "./models/selfie_segmenter_landscape.tflite?url";

export const TASKS_VISION_WORKER_FILESET = { wasmLoaderPath, wasmBinaryPath };

let moduleFactory: Promise<unknown> | undefined;

/**
 * MediaPipe loads the wasm through import(wasmLoaderPath), reads the ModuleFactory the loader sets on the
 * worker scope, then clears it. A later import() of the same URL is served from the module cache without
 * running again, so every segmenter after the first (CPU fallback, recovery, model switch) would fail with
 * "ModuleFactory not set". Keep the factory from the first load and put it back before each instantiation.
 */
export async function installTasksVisionModuleFactory(): Promise<void> {
    moduleFactory ??= (import(/* @vite-ignore */ wasmLoaderPath) as Promise<{ default: unknown }>).then(
        (loader) => loader.default,
    );
    (self as { ModuleFactory?: unknown }).ModuleFactory = await moduleFactory;
}

export type SegmenterModel = "general" | "landscape";

/**
 * MediaPipe selfie segmenter models: the general one runs on a 256x256 input, the landscape one on 144x256,
 * i.e. about 40% fewer pixels for the same result on a landscape camera.
 * https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter#selfie-model
 */
export const SEGMENTER_MODEL_URLS: Record<SegmenterModel, string> = {
    general: selfieSegmenterModelUrl,
    landscape: selfieSegmenterLandscapeModelUrl,
};

/** Practically every webcam is 4:3 or wider; phones held upright are the portrait case. */
export function selectSegmenterModel(width: number, height: number): SegmenterModel {
    return width / height >= 4 / 3 ? "landscape" : "general";
}
