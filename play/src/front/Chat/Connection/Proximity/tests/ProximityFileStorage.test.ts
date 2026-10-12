import { describe, expect, it, vi } from "vitest";
import { MemoryProximityFileSink, ProximityFileStorage } from "../ProximityFileStorage";

vi.mock("../ProximityFileStorageWorker?worker&inline", () => ({
    default: class {
        onmessage: unknown = null;
        onerror: ((event: ErrorEvent) => void) | null = null;

        // Like Firefox refusing a cross-origin worker script: the failure only shows up as an error event.
        postMessage(): void {
            setTimeout(() => this.onerror?.(new ErrorEvent("error", { message: "Security Error" })));
        }

        terminate(): void {}
    },
}));

describe("ProximityFileStorage", () => {
    it("should fall back to an in-memory sink when the Origin Private File System is unavailable", async () => {
        const storage = new ProximityFileStorage();

        const sink = await storage.createSink("transfer-1");
        await sink.write(new Uint8Array([104, 105]));
        const blob = await sink.finish("text/plain");

        expect(sink).toBeInstanceOf(MemoryProximityFileSink);
        expect(await blob.text()).toBe("hi");
        expect(blob.type).toBe("text/plain");
        await storage.destroy();
    });

    it("should fall back to an in-memory sink when the storage worker fails to load", async () => {
        vi.stubGlobal("Worker", class {});
        vi.stubGlobal("navigator", {
            storage: { getDirectory: () => Promise.resolve({}) },
            locks: {
                request: (_name: string, callback: () => Promise<void>) => callback(),
                query: () => Promise.resolve({ held: [] }),
            },
        });
        try {
            const storage = new ProximityFileStorage();

            expect(await storage.createSink("transfer-1")).toBeInstanceOf(MemoryProximityFileSink);
            await storage.destroy();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
