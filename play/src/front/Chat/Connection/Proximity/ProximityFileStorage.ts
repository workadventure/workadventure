import { v4 as uuidv4 } from "uuid";
import ProximityFileStorageWorker from "./ProximityFileStorageWorker?worker&inline";

type ProximityFileStorageRequestBody =
    | { type: "open"; session: string; name: string }
    | { type: "write"; session: string; name: string; buffer: ArrayBuffer; byteOffset: number; byteLength: number }
    | { type: "close"; session: string; name: string }
    | { type: "remove"; session: string; name: string }
    | { type: "removeSession"; session: string }
    | { type: "purge"; liveSessions: string[] };

export type ProximityFileStorageRequest = ProximityFileStorageRequestBody & { id: number };

export type ProximityFileStorageResponse = { id: number; error?: string };

/** Where the decrypted bytes of one received file go. */
export interface ProximityFileSink {
    write(bytes: Uint8Array<ArrayBuffer>): Promise<void>;
    finish(mimeType: string): Promise<Blob>;
    discard(): Promise<void>;
}

/**
 * Fallback when the Origin Private File System is unavailable (private browsing, old browsers,
 * tests): the file is folded into a Blob, which Chrome and Firefox keep off the JS heap.
 */
export class MemoryProximityFileSink implements ProximityFileSink {
    private blob = new Blob([]);

    write(bytes: Uint8Array<ArrayBuffer>): Promise<void> {
        this.blob = new Blob([this.blob, bytes]);
        return Promise.resolve();
    }

    finish(mimeType: string): Promise<Blob> {
        return Promise.resolve(new Blob([this.blob], { type: mimeType }));
    }

    discard(): Promise<void> {
        return Promise.resolve();
    }
}

const SESSION_LOCK_PREFIX = "wa-proximity-file-storage:";

/**
 * Writes received files to the Origin Private File System so they never sit in memory (Safari
 * keeps Blobs in RAM). Files live in a per-session directory that is removed by destroy(). A Web
 * Lock names the session while it is alive, so a new session can purge the directories left
 * behind by tabs that were closed mid-transfer.
 */
export class ProximityFileStorage {
    private readonly session = uuidv4();
    private readonly available: Promise<boolean>;
    private worker: Worker | undefined;
    private nextRequestId = 0;
    private readonly pendingRequests = new Map<number, { resolve: () => void; reject: (error: Error) => void }>();
    private releaseSessionLock: (() => void) | undefined;

    constructor() {
        this.available = this.initialize();
    }

    async createSink(name: string): Promise<ProximityFileSink> {
        if (!(await this.available)) {
            return new MemoryProximityFileSink();
        }
        try {
            await this.request({ type: "open", session: this.session, name });
        } catch (error) {
            console.warn("Unable to open a proximity file on disk, keeping it in memory", error);
            return new MemoryProximityFileSink();
        }
        return {
            write: (bytes) =>
                this.request(
                    {
                        type: "write",
                        session: this.session,
                        name,
                        buffer: bytes.buffer,
                        byteOffset: bytes.byteOffset,
                        byteLength: bytes.byteLength,
                    },
                    [bytes.buffer],
                ),
            finish: async (mimeType) => {
                await this.request({ type: "close", session: this.session, name });
                const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle(this.session);
                const file = await (await directory.getFileHandle(name)).getFile();
                // slice() re-types the disk-backed file without copying it.
                return file.slice(0, file.size, mimeType);
            },
            discard: () => this.request({ type: "remove", session: this.session, name }),
        };
    }

    async destroy(): Promise<void> {
        if (await this.available) {
            await this.request({ type: "removeSession", session: this.session }).catch((error) =>
                console.warn("Unable to remove proximity files from disk", error),
            );
        }
        this.worker?.terminate();
        this.worker = undefined;
        this.releaseSessionLock?.();
    }

    private async initialize(): Promise<boolean> {
        if (typeof Worker === "undefined" || !navigator.storage?.getDirectory || !navigator.locks) {
            return false;
        }
        try {
            // Throws in Safari private browsing, where OPFS is disabled.
            await navigator.storage.getDirectory();
            await new Promise<void>((lockAcquired) => {
                navigator.locks
                    .request(
                        SESSION_LOCK_PREFIX + this.session,
                        () =>
                            new Promise<void>((release) => {
                                this.releaseSessionLock = release;
                                lockAcquired();
                            }),
                    )
                    .catch((error) => console.warn("Unable to lock the proximity file storage session", error));
            });
            const { held = [] } = await navigator.locks.query();
            const liveSessions = held.flatMap((lock) =>
                lock.name?.startsWith(SESSION_LOCK_PREFIX) ? [lock.name.slice(SESSION_LOCK_PREFIX.length)] : [],
            );
            await this.request({ type: "purge", liveSessions });
            return true;
        } catch (error) {
            console.warn("Proximity file storage unavailable, received files will stay in memory", error);
            return false;
        }
    }

    private request(message: ProximityFileStorageRequestBody, transfer: Transferable[] = []): Promise<void> {
        if (!this.worker) {
            this.worker = new ProximityFileStorageWorker();
            this.worker.onmessage = (event: MessageEvent<ProximityFileStorageResponse>) => {
                const pending = this.pendingRequests.get(event.data.id);
                this.pendingRequests.delete(event.data.id);
                if (event.data.error !== undefined) {
                    pending?.reject(new Error(event.data.error));
                } else {
                    pending?.resolve();
                }
            };
        }
        const id = this.nextRequestId++;
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.worker?.postMessage({ ...message, id }, transfer);
        });
    }
}
