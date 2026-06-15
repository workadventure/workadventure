import { describe, expect, it } from "vitest";
import {
    decryptProximityFileBlob,
    encryptProximityFileBlob,
    generateProximityFileEncryptionKey,
    hashProximityFileBlob,
} from "../ProximityFileTransferSecurity";

async function readBlobText(blob: Blob): Promise<string> {
    return new TextDecoder().decode(await readBlobAsArrayBuffer(blob));
}

describe("Proximity file transfer security", () => {
    it("should hash a blob with SHA-256 when read by chunks", async () => {
        const blob = new Blob(["hello"]);

        const digest = await hashProximityFileBlob(blob);

        expect(digest).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    });

    it("should decrypt encrypted file bytes when the key and metadata match", async () => {
        const key = await generateProximityFileEncryptionKey();
        const source = new Blob(["hello"], { type: "text/plain" });

        const encrypted = await encryptProximityFileBlob(source, key);
        const decrypted = await decryptProximityFileBlob(encrypted.blob, key, encrypted.metadata);

        expect(encrypted.metadata.algorithm).toBe("XCHACHA20-POLY1305");
        expect(await readBlobText(decrypted)).toBe("hello");
        expect(decrypted.type).toBe("text/plain");
    });

    it("should reject tampered ciphertext when decrypting encrypted file bytes", async () => {
        const key = await generateProximityFileEncryptionKey();
        const encrypted = await encryptProximityFileBlob(new Blob(["hello"]), key);
        const bytes = new Uint8Array(await readBlobAsArrayBuffer(encrypted.blob));
        bytes[bytes.length - 1] ^= 1;

        await expect(decryptProximityFileBlob(new Blob([bytes]), key, encrypted.metadata)).rejects.toThrow(
            "Unable to decrypt proximity file transfer",
        );
    });
});

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    if (blob.arrayBuffer) {
        return blob.arrayBuffer();
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read test blob"));
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result);
                return;
            }
            reject(new Error("Unable to read test blob"));
        };
        reader.readAsArrayBuffer(blob);
    });
}
