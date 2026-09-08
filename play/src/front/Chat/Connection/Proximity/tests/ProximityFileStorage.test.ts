import { describe, expect, it } from "vitest";
import { MemoryProximityFileSink, ProximityFileStorage } from "../ProximityFileStorage";

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
});
