import { IndexedDBStoreWorker } from "matrix-js-sdk/lib/indexeddb-worker";

/**
 * Worker entry point for matrix-js-sdk's IndexedDB store.
 *
 * matrix-js-sdk's shipped `indexeddb-worker.js` only re-exports the
 * {@link IndexedDBStoreWorker} class — it does NOT wire up the worker message
 * handlers. The application is expected to provide this tiny entry script (see the
 * class doc-comment in matrix-js-sdk). It is loaded via `?worker&inline` from
 * {@link MatrixClientWrapper} so it is bundled as a same-origin blob worker, which
 * avoids the cross-origin `SecurityError` in the dev setup where Vite serves assets
 * from a different sub-domain than the app.
 */

// The dedicated worker global scope, typed minimally to avoid pulling in the
// "webworker" lib (which conflicts with the project's DOM lib).
interface WorkerScope {
    postMessage(message: unknown): void;
    onmessage: ((event: MessageEvent) => void) | null;
}
const workerScope = self as unknown as WorkerScope;

// The SDK invokes the passed function as `postMessage.call(null, message)`; passing the
// bare `self.postMessage` would rebind `this` and make the worker's postMessage throw
// "Illegal invocation", so wrap it in an arrow function.
const remoteWorker = new IndexedDBStoreWorker((message: unknown) => workerScope.postMessage(message));

workerScope.onmessage = remoteWorker.onMessage;
