import { describe, expect, it } from "vitest";
import {
    generateProximityFileEncryptionKey,
    getEncryptedTransferWireSize,
    hashProximityFileBlob,
    ProximityFileStreamDecryptor,
    ProximityFileStreamEncryptor,
    type ProximityFileTransferEncryptionKey,
} from "../ProximityFileTransferSecurity";

const HELLO_SHA256 = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

async function encrypt(blob: Blob, key: ProximityFileTransferEncryptionKey) {
    const encryptor = await ProximityFileStreamEncryptor.create(key, blob.type);
    const frames: Uint8Array<ArrayBuffer>[] = [];
    for await (const frame of encryptor.frames(blob)) {
        frames.push(frame);
    }
    return { bytes: new Uint8Array(await new Blob(frames).arrayBuffer()), metadata: encryptor.metadata };
}

describe("Proximity file transfer security", () => {
    it("should hash a blob with SHA-256", async () => {
        expect(await hashProximityFileBlob(new Blob(["hello"]))).toBe(HELLO_SHA256);
    });

    it("should announce the exact wire size of an encrypted stream", async () => {
        const key = await generateProximityFileEncryptionKey();

        for (const content of ["", "hello"]) {
            // eslint-disable-next-line no-await-in-loop -- sequential fixtures
            const { bytes } = await encrypt(new Blob([content]), key);
            expect(bytes.byteLength).toBe(getEncryptedTransferWireSize(content.length));
        }
    });

    it("should decrypt and hash a stream whose frames span several chunks", async () => {
        const key = await generateProximityFileEncryptionKey();
        const { bytes, metadata } = await encrypt(new Blob(["hello"], { type: "text/plain" }), key);
        const decryptor = await ProximityFileStreamDecryptor.create(key, metadata);

        // 3-byte chunks split both the length prefix and the ciphertext across pushes.
        for (let offset = 0; offset < bytes.byteLength; offset += 3) {
            decryptor.push(bytes.subarray(offset, offset + 3));
        }
        const { blob, sha256 } = decryptor.finish();

        expect(await blob.text()).toBe("hello");
        expect(blob.type).toBe("text/plain");
        expect(sha256).toBe(HELLO_SHA256);
    });

    it("should round-trip an empty file", async () => {
        const key = await generateProximityFileEncryptionKey();
        const { bytes, metadata } = await encrypt(new Blob([]), key);
        const decryptor = await ProximityFileStreamDecryptor.create(key, metadata);

        decryptor.push(bytes);

        expect(decryptor.finish().blob.size).toBe(0);
    });

    it("should reject tampered ciphertext", async () => {
        const key = await generateProximityFileEncryptionKey();
        const { bytes, metadata } = await encrypt(new Blob(["hello"]), key);
        bytes[bytes.length - 1] ^= 1;
        const decryptor = await ProximityFileStreamDecryptor.create(key, metadata);

        expect(() => decryptor.push(bytes)).toThrow("Unable to decrypt proximity file transfer");
    });

    it("should reject a truncated stream", async () => {
        const key = await generateProximityFileEncryptionKey();
        const { bytes, metadata } = await encrypt(new Blob(["hello"]), key);
        const decryptor = await ProximityFileStreamDecryptor.create(key, metadata);

        decryptor.push(bytes.subarray(0, bytes.byteLength - 1));

        expect(() => decryptor.finish()).toThrow("Unable to decrypt proximity file transfer");
    });
});
