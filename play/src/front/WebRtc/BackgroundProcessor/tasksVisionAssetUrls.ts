// The wasm, its loader and the models are imported as vite assets: they are emitted under /assets with a content
// hash, so a @mediapipe/tasks-vision bump can never be served a stale copy from the CDN edge, and nothing is
// committed to the repository.
//
// Only the main thread imports this module; it sends the URLs to the worker in the "initialize" message. Inside the
// worker bundle, Vite would resolve them against self.location, which is a blob: URL when the worker is started
// from the assets domain (see MediaPipeTasksVisionWorkerTransformer.startWorker), and new URL() would throw.
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_module_internal.js?url";
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url";
import selfieSegmenterModelUrl from "./models/selfie_segmenter.tflite?url";
import selfieSegmenterLandscapeModelUrl from "./models/selfie_segmenter_landscape.tflite?url";
import type { TasksVisionAssetUrls } from "./tasksVisionAssets";

const absolute = (url: string): string => new URL(url, import.meta.url).href;

/**
 * MediaPipe selfie segmenter models: the general one runs on a 256x256 input, the landscape one on 144x256,
 * i.e. about 40% fewer pixels for the same result on a landscape camera.
 * https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter#selfie-model
 *
 * Provenance: both files under ./models are byte-for-byte copies of Google's MediaPipe model zoo (Apache 2.0).
 * No npm package ships them (@mediapipe/tasks-vision only contains the wasm), and the model of the retired
 * @mediapipe/selfie_segmentation package lacks the TFLite metadata the Tasks API needs, so they are committed.
 * Verified on 2026-09-17:
 * - selfie_segmenter.tflite (249 537 bytes)
 *   https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite
 *   sha256 191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b
 * - selfie_segmenter_landscape.tflite (250 177 bytes)
 *   https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite
 *   sha256 490e9ea734313e0de10fa0cd9e3c6133e36ea4db2b7a49bde9ef019f72796b8e
 */
export const TASKS_VISION_ASSET_URLS: TasksVisionAssetUrls = {
    wasmLoaderPath: absolute(wasmLoaderPath),
    wasmBinaryPath: absolute(wasmBinaryPath),
    models: {
        general: absolute(selfieSegmenterModelUrl),
        landscape: absolute(selfieSegmenterLandscapeModelUrl),
    },
};
