import { sha256 } from "@noble/hashes/sha2.js";
import sodium, { type StateAddress } from "libsodium-wrappers-sumo";

const PROXIMITY_FILE_TRANSFER_HASH_CHUNK_SIZE = 1024 * 1024;
const PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE = 1024 * 1024;

export type ProximityFileTransferEncryptionMetadata = {
    algorithm: "XCHACHA20-POLY1305";
    iv: string;
    mimeType: string;
};

export type ProximityFileTransferEncryptionKey = Uint8Array;

export type EncryptedProximityFileBlob = {
    blob: Blob;
    metadata: ProximityFileTransferEncryptionMetadata;
};

export async function hashProximityFileBlob(blob: Blob): Promise<string> {
    const hasher = sha256.create();
    await hashBlobChunks(blob, hasher, 0);
    return bytesToHex(hasher.digest());
}

export async function generateProximityFileEncryptionKey(): Promise<ProximityFileTransferEncryptionKey> {
    await sodium.ready;
    return sodium.crypto_secretstream_xchacha20poly1305_keygen();
}

export async function exportProximityFileEncryptionKey(key: ProximityFileTransferEncryptionKey): Promise<string> {
    await sodium.ready;
    return sodium.to_base64(key, sodium.base64_variants.ORIGINAL);
}

export async function importProximityFileEncryptionKey(rawKey: string): Promise<ProximityFileTransferEncryptionKey> {
    await sodium.ready;
    return sodium.from_base64(rawKey, sodium.base64_variants.ORIGINAL);
}

export async function encryptProximityFileBlob(
    blob: Blob,
    key: ProximityFileTransferEncryptionKey,
): Promise<EncryptedProximityFileBlob> {
    await sodium.ready;
    const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
    const encryptedChunks = await encryptBlobChunks(blob, state, 0);
    return {
        blob: new Blob(encryptedChunks, { type: "application/octet-stream" }),
        metadata: {
            algorithm: "XCHACHA20-POLY1305",
            iv: sodium.to_base64(header, sodium.base64_variants.ORIGINAL),
            mimeType: blob.type,
        },
    };
}

export async function decryptProximityFileBlob(
    blob: Blob,
    key: ProximityFileTransferEncryptionKey,
    metadata: ProximityFileTransferEncryptionMetadata,
): Promise<Blob> {
    await sodium.ready;
    try {
        const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
            sodium.from_base64(metadata.iv, sodium.base64_variants.ORIGINAL),
            key,
        );
        return new Blob(decryptFramedChunks(new Uint8Array(await readBlobAsArrayBuffer(blob)), state, 0), {
            type: metadata.mimeType,
        });
    } catch {
        throw new Error("Unable to decrypt proximity file transfer");
    }
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashBlobChunks(blob: Blob, hasher: ReturnType<typeof sha256.create>, offset: number): Promise<void> {
    if (offset >= blob.size) {
        return;
    }

    const chunkBuffer = await readBlobAsArrayBuffer(
        blob.slice(offset, offset + PROXIMITY_FILE_TRANSFER_HASH_CHUNK_SIZE),
    );
    hasher.update(new Uint8Array(chunkBuffer));
    await hashBlobChunks(blob, hasher, offset + PROXIMITY_FILE_TRANSFER_HASH_CHUNK_SIZE);
}

async function encryptBlobChunks(blob: Blob, state: StateAddress, offset: number): Promise<ArrayBuffer[]> {
    if (offset >= blob.size) {
        return [];
    }

    const nextOffset = offset + PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE;
    const tag =
        nextOffset >= blob.size
            ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
            : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
    const chunkBuffer = await readBlobAsArrayBuffer(blob.slice(offset, nextOffset));
    const encryptedChunk = sodium.crypto_secretstream_xchacha20poly1305_push(
        state,
        new Uint8Array(chunkBuffer),
        null,
        tag,
    );
    return [frameEncryptedChunk(encryptedChunk), ...(await encryptBlobChunks(blob, state, nextOffset))];
}

function decryptFramedChunks(bytes: Uint8Array, state: StateAddress, offset: number): ArrayBuffer[] {
    if (offset >= bytes.byteLength) {
        return [];
    }

    const chunkLength = readFrameLength(bytes, offset);
    const chunkStart = offset + 4;
    const chunkEnd = chunkStart + chunkLength;
    const pulled = sodium.crypto_secretstream_xchacha20poly1305_pull(state, bytes.slice(chunkStart, chunkEnd), null);
    if (!pulled) {
        throw new Error("Unable to decrypt proximity file transfer");
    }
    return [copyToArrayBuffer(pulled.message), ...decryptFramedChunks(bytes, state, chunkEnd)];
}

function frameEncryptedChunk(bytes: Uint8Array): ArrayBuffer {
    const frame = new Uint8Array(4 + bytes.byteLength);
    new DataView(frame.buffer).setUint32(0, bytes.byteLength, false);
    frame.set(bytes, 4);
    return frame.buffer;
}

function readFrameLength(bytes: Uint8Array, offset: number): number {
    if (offset + 4 > bytes.byteLength) {
        throw new Error("Unable to decrypt proximity file transfer");
    }
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    if (blob.arrayBuffer) {
        return blob.arrayBuffer();
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read proximity file transfer blob"));
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result);
                return;
            }
            reject(new Error("Unable to read proximity file transfer blob"));
        };
        reader.readAsArrayBuffer(blob);
    });
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}
