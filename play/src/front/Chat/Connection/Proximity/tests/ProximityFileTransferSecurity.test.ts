import { describe, expect, it } from "vitest";
import {
    encryptProximityFileBlob,
    generateProximityFileEncryptionKey,
    ProximityFileStreamDecryptor,
} from "../ProximityFileTransferSecurity";

const HELLO_SHA256 = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

describe("Proximity file transfer security", () => {
    it("should hash the plaintext while encrypting", async () => {
        const encrypted = await encryptProximityFileBlob(
            new Blob(["hello"]),
            await generateProximityFileEncryptionKey(),
        );

        expect(encrypted.sha256).toBe(HELLO_SHA256);
        expect(encrypted.metadata.algorithm).toBe("XCHACHA20-POLY1305");
    });

    it("should decrypt and hash a stream whose frames span several chunks", async () => {
        const key = await generateProximityFileEncryptionKey();
        const encrypted = await encryptProximityFileBlob(new Blob(["hello"], { type: "text/plain" }), key);
        const bytes = new Uint8Array(await encrypted.blob.arrayBuffer());
        const decryptor = await ProximityFileStreamDecryptor.create(key, encrypted.metadata);

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
        const encrypted = await encryptProximityFileBlob(new Blob([]), key);
        const decryptor = await ProximityFileStreamDecryptor.create(key, encrypted.metadata);

        decryptor.push(new Uint8Array(await encrypted.blob.arrayBuffer()));

        expect(decryptor.finish().blob.size).toBe(0);
    });

    it("should reject tampered ciphertext", async () => {
        const key = await generateProximityFileEncryptionKey();
        const encrypted = await encryptProximityFileBlob(new Blob(["hello"]), key);
        const bytes = new Uint8Array(await encrypted.blob.arrayBuffer());
        bytes[bytes.length - 1] ^= 1;
        const decryptor = await ProximityFileStreamDecryptor.create(key, encrypted.metadata);

        expect(() => decryptor.push(bytes)).toThrow("Unable to decrypt proximity file transfer");
    });

    it("should reject a truncated stream", async () => {
        const key = await generateProximityFileEncryptionKey();
        const encrypted = await encryptProximityFileBlob(new Blob(["hello"]), key);
        const bytes = new Uint8Array(await encrypted.blob.arrayBuffer());
        const decryptor = await ProximityFileStreamDecryptor.create(key, encrypted.metadata);

        decryptor.push(bytes.subarray(0, bytes.byteLength - 1));

        expect(() => decryptor.finish()).toThrow("Unable to decrypt proximity file transfer");
    });
});
