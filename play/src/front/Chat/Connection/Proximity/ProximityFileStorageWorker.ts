import type { ProximityFileStorageRequest, ProximityFileStorageResponse } from "./ProximityFileStorage";

/**
 * Worker entry point for the proximity file transfer storage.
 *
 * Received files are written to the Origin Private File System through a sync access handle:
 * it is the only streaming write API Safari exposes, and it only exists inside a worker.
 * Loaded via `?worker&inline` from {@link ProximityFileStorage} (see matrixIndexedDbWorker.ts
 * for why the inline same-origin worker is needed).
 */

// Typed minimally to avoid pulling in the "webworker" lib (which conflicts with the DOM lib).
interface SyncAccessHandle {
    write(buffer: ArrayBufferView, options?: { at?: number }): number;
    flush(): void;
    close(): void;
}
interface WorkerScope {
    postMessage(message: ProximityFileStorageResponse): void;
    onmessage: ((event: MessageEvent<ProximityFileStorageRequest>) => void) | null;
}
const workerScope = self as unknown as WorkerScope;

const openFiles = new Map<string, { handle: SyncAccessHandle; position: number }>();

function fileKey(session: string, name: string): string {
    return `${session}/${name}`;
}

function closeFile(key: string): void {
    const file = openFiles.get(key);
    if (!file) {
        return;
    }
    openFiles.delete(key);
    file.handle.flush();
    file.handle.close();
}

async function handleRequest(request: ProximityFileStorageRequest): Promise<void> {
    const root = await navigator.storage.getDirectory();
    switch (request.type) {
        case "open": {
            const directory = await root.getDirectoryHandle(request.session, { create: true });
            const fileHandle = await directory.getFileHandle(request.name, { create: true });
            const handle = await (
                fileHandle as unknown as { createSyncAccessHandle(): Promise<SyncAccessHandle> }
            ).createSyncAccessHandle();
            openFiles.set(fileKey(request.session, request.name), { handle, position: 0 });
            return;
        }
        case "write": {
            const file = openFiles.get(fileKey(request.session, request.name));
            if (!file) {
                throw new Error("Proximity file is not open");
            }
            const bytes = new Uint8Array(request.buffer, request.byteOffset, request.byteLength);
            file.position += file.handle.write(bytes, { at: file.position });
            return;
        }
        case "close": {
            closeFile(fileKey(request.session, request.name));
            return;
        }
        case "remove": {
            closeFile(fileKey(request.session, request.name));
            const directory = await root.getDirectoryHandle(request.session);
            await directory.removeEntry(request.name);
            return;
        }
        case "removeSession": {
            for (const key of openFiles.keys()) {
                if (key.startsWith(`${request.session}/`)) {
                    closeFile(key);
                }
            }
            await root.removeEntry(request.session, { recursive: true });
            return;
        }
        case "purge": {
            // Directories are named after sessions; a session with no live Web Lock belongs to a
            // closed tab, so whatever it left behind can go.
            const liveSessions = new Set(request.liveSessions);
            const entries = (root as unknown as { keys(): AsyncIterable<string> }).keys();
            for await (const name of entries) {
                if (!liveSessions.has(name)) {
                    await root.removeEntry(name, { recursive: true }).catch(() => undefined);
                }
            }
            return;
        }
        default: {
            const _exhaustiveCheck: never = request;
        }
    }
}

workerScope.onmessage = (event) => {
    const request = event.data;
    handleRequest(request).then(
        () => workerScope.postMessage({ id: request.id }),
        (error) => workerScope.postMessage({ id: request.id, error: String(error) }),
    );
};
