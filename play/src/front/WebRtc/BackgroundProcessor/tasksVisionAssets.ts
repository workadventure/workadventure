// The segmenter runs in a module worker, where MediaPipe loads its wasm through a dynamic import(), which needs
// the "module" flavour of the loader. That flavour only ships a SIMD build; every browser that has WebGL2 in an
// OffscreenCanvas worker (Chrome 69+, Firefox 105+, Safari 17+) also has wasm SIMD, so no nosimd fallback exists.
//
// This module is imported by the worker: the asset URLs themselves come from the main thread (tasksVisionAssetUrls.ts).

export type SegmenterModel = "general" | "landscape";

export type TasksVisionAssetUrls = {
    wasmLoaderPath: string;
    wasmBinaryPath: string;
    models: Record<SegmenterModel, string>;
};

let moduleFactory: Promise<unknown> | undefined;

/**
 * MediaPipe loads the wasm through import(wasmLoaderPath), reads the ModuleFactory the loader sets on the
 * worker scope, then clears it. A later import() of the same URL is served from the module cache without
 * running again, so every segmenter after the first (CPU fallback, recovery, model switch) would fail with
 * "ModuleFactory not set". Keep the factory from the first load and put it back before each instantiation.
 */
export async function installTasksVisionModuleFactory(wasmLoaderPath: string): Promise<void> {
    moduleFactory ??= (import(/* @vite-ignore */ wasmLoaderPath) as Promise<{ default: unknown }>).then(
        (loader) => loader.default,
    );
    (self as { ModuleFactory?: unknown }).ModuleFactory = await moduleFactory;
}

/** Practically every webcam is 4:3 or wider; phones held upright are the portrait case. */
export function selectSegmenterModel(width: number, height: number): SegmenterModel {
    return width / height >= 4 / 3 ? "landscape" : "general";
}
