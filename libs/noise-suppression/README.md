# @workadventure/noise-suppression

Browser noise suppression built on LiteRT.js and the DTLN models.

This package is browser-only. It does not ship a native addon, Rust runtime, or
Node-specific backend. The runtime is an ESM library bundled with Vite and
loads the packaged LiteRT.js Wasm assets plus the two DTLN `.tflite` models.

## What it does

- Runs the existing DTLN model pair in the browser with LiteRT.js
- Preserves the synchronous `dtln_create` / `dtln_denoise` / `dtln_stop` API
- Enables LiteRT.js threads automatically when the page is cross-origin
  isolated
- Packages runtime assets so consumers do not need to manage the model and Wasm
  files manually

## Installation

```bash
npm install @workadventure/noise-suppression
```

## Usage

```ts
import createNoiseSuppressionModule from "@workadventure/noise-suppression";

const noiseSuppression = await createNoiseSuppressionModule();
await noiseSuppression.ready;

const handle = noiseSuppression.dtln_create();
const input = new Float32Array(512);
const output = new Float32Array(512);

noiseSuppression.dtln_denoise(handle, input, output);
noiseSuppression.dtln_stop(handle);
```

## API

`createNoiseSuppressionModule(options?)`

- Returns a promise resolving to the runtime module
- Default export

Module methods:

- `dtln_create()`
- `dtln_denoise(handle, input, output)`
- `dtln_stop(handle)`
- `dtln_destroy(handle)`
- `get_profile(handle)`
- `reset_profile(handle)`
- `dtln_profile_get(handle)`
- `dtln_profile_reset(handle)`

Module properties:

- `ready`
- `modelDetails`
- `audioConfig`

## Options

```ts
interface NoiseSuppressionModuleOptions {
  liteRtWasmRoot?: string;
  model1Url?: string;
  model2Url?: string;
  threads?: boolean;
  numThreads?: number;
  logModelDetails?: boolean;
  enableProfiling?: boolean;
}
```

Defaults:

- packaged LiteRT.js Wasm runtime
- packaged `model_quant_1.tflite`
- packaged `model_quant_2.tflite`
- `threads: true` when `crossOriginIsolated === true`

## Audio contract

- sample rate: `16000`
- channels: `1`
- frame size: `512`
- frame duration: `32 ms`
- sample format: `Float32Array`

`dtln_denoise` accepts any input length that is a multiple of `128`, but the
realtime target remains the standard 512-sample frame.

## AudioWorklet

The package also ships a dedicated AudioWorklet entrypoint that resolves and
fetches the Wasm/model assets on the main thread, then sends the bytes into the
processor.

```ts
import {
  createNoiseSuppressionAudioWorklet,
} from "@workadventure/noise-suppression/audio-worklet";

const audioContext = new AudioContext({ sampleRate: 16000 });
const worklet = await createNoiseSuppressionAudioWorklet(audioContext);

await worklet.ready;
sourceNode.connect(worklet.node).connect(audioContext.destination);
```

Notes:

- the worklet initializes asynchronously
- audio passes through until the denoiser is ready by default
- once ready, the processor buffers four 128-sample render quanta into one
  512-sample DTLN frame and drains a matching output ring buffer
- the worklet path uses a repository-local LiteRT fork because stock LiteRT.js
  expects `document` or `importScripts` during Wasm bootstrap

## Vite development

This repository is a Vite library project.

```bash
npm install
npm run dev
```

The Vite dev server is configured with `COOP` and `COEP` headers so threaded
LiteRT.js execution is available during local development.

For a strict TypeScript check without building:

```bash
npm run typecheck
```

## Build

```bash
npm run build
```

The Vite library build writes:

- `dist/index.js`
- `dist/index.d.ts`
- `dist/assets/*.tflite`
- `dist/vendor/litert/*`

## Benchmarks

For local browser benchmarks:

```bash
node scripts/benchmark-browser-profile.mjs
```

Then open one of:

- `/browser-benchmark-litert.html`
- `/browser-benchmark-compare.html`
- `/browser-benchmark-litert-manual.html`
- `/audio-worklet-validation.html`
- `/audio-worklet.html`

The compare page now benchmarks forced single-threaded LiteRT against threaded
LiteRT under cross-origin isolation.

## Notes

- The current implementation uses LiteRT.js internal synchronous runner APIs to
  keep `dtln_denoise()` synchronous.
- Best performance requires cross-origin isolation in production too.

## ADRs

- [Architecture Decision Records](./docs/adr/README.md)
