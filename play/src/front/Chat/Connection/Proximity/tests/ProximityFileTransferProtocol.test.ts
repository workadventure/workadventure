import { describe, expect, it } from "vitest";
import {
    decodeProximityFileChunkFrame,
    decodeProximityFileControlMessage,
    encodeProximityFileChunkFrame,
    encodeProximityFileControlMessage,
} from "../ProximityFileTransferProtocol";

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

describe("Proximity file transfer control messages", () => {
    it("should preserve encryption key messages", () => {
        const encoded = encodeProximityFileControlMessage({
            type: "proximity_file_key",
            transferId: "transfer-1",
            rawKey: "key",
        });

        expect(decodeProximityFileControlMessage(encoded)).toEqual({
            type: "proximity_file_key",
            transferId: "transfer-1",
            rawKey: "key",
        });
    });

    it("should preserve encrypted start metadata", () => {
        const encoded = encodeProximityFileControlMessage({
            type: "proximity_file_start",
            transferId: "transfer-1",
            fileName: "hello.txt",
            mimeType: "text/plain",
            size: 5,
            sha256: "digest",
            encryptionAlgorithm: "XCHACHA20-POLY1305",
            encryptionIv: "iv",
            plainMimeType: "text/plain",
        });

        expect(decodeProximityFileControlMessage(encoded)).toMatchObject({
            sha256: "digest",
            encryptionAlgorithm: "XCHACHA20-POLY1305",
            encryptionIv: "iv",
            plainMimeType: "text/plain",
        });
    });
});
