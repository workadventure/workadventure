import { describe, expect, it } from "vitest";
import { decodeProximityFileChunkFrame, encodeProximityFileChunkFrame } from "../ProximityFileTransferProtocol";

describe("Proximity file transfer binary framing", () => {
    it("should preserve transfer id and chunk bytes", () => {
        const payload = new Uint8Array([1, 2, 3, 4]);

        const frame = encodeProximityFileChunkFrame("transfer-1", payload);
        const decoded = decodeProximityFileChunkFrame(frame);

        expect(decoded).toEqual({
            transferId: "transfer-1",
            chunk: payload,
        });
    });
});
