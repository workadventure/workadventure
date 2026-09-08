import { describe, expect, it } from "vitest";
import {
    decryptProximityFileBlob,
    encryptProximityFileBlob,
    generateProximityFileEncryptionKey,
    hashProximityFileBlob,
} from "../ProximityFileTransferSecurity";

describe("Proximity file transfer security", () => {
    it("should hash a blob with SHA-256", async () => {
        const digest = await hashProximityFileBlob(new Blob(["hello"]));

        expect(digest).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    });

    it("should decrypt encrypted file bytes when the key and metadata match", async () => {
        const key = await generateProximityFileEncryptionKey();
        const source = new Blob(["hello"], { type: "text/plain" });

        const encrypted = await encryptProximityFileBlob(source, key);
        const decrypted = await decryptProximityFileBlob(encrypted.blob, key, encrypted.metadata);

        expect(encrypted.metadata.algorithm).toBe("XCHACHA20-POLY1305");
        expect(await decrypted.text()).toBe("hello");
        expect(decrypted.type).toBe("text/plain");
    });

    it("should reject tampered ciphertext when decrypting encrypted file bytes", async () => {
        const key = await generateProximityFileEncryptionKey();
        const encrypted = await encryptProximityFileBlob(new Blob(["hello"]), key);
        const bytes = new Uint8Array(await encrypted.blob.arrayBuffer());
        bytes[bytes.length - 1] ^= 1;

        await expect(decryptProximityFileBlob(new Blob([bytes]), key, encrypted.metadata)).rejects.toThrow(
            "Unable to decrypt proximity file transfer",
        );
    });
});
