import sodium, { type StateAddress } from "libsodium-wrappers-sumo";

const PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE = 1024 * 1024;
// crypto_secretstream_xchacha20poly1305_ABYTES (17) + the 4-byte length prefix of each frame.
const PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_OVERHEAD = 17 + 4;

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

/**
 * Wire size of an encrypted transfer for a plaintext of `plainSize` bytes: encrypted chunks travel
 * with a per-chunk overhead, so the announced size may legitimately be larger than the plaintext.
 */
export function getMaxEncryptedTransferWireSize(plainSize: number): number {
    if (plainSize === 0) {
        return 0;
    }
    return (
        plainSize +
        Math.ceil(plainSize / PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE) *
            PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_OVERHEAD
    );
}

export async function hashProximityFileBlob(blob: Blob): Promise<string> {
    await sodium.ready;
    return sodium.to_hex(sodium.crypto_hash_sha256(new Uint8Array(await blob.arrayBuffer())));
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
    const encryptedChunks = await encryptBlobChunks(blob, state);
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
        return new Blob(decryptFramedChunks(new Uint8Array(await blob.arrayBuffer()), state), {
            type: metadata.mimeType,
        });
    } catch {
        throw new Error("Unable to decrypt proximity file transfer");
    }
}

async function encryptBlobChunks(blob: Blob, state: StateAddress): Promise<Uint8Array<ArrayBuffer>[]> {
    const frames: Uint8Array<ArrayBuffer>[] = [];
    for (let offset = 0; offset < blob.size; offset += PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE) {
        const nextOffset = offset + PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE;
        const tag =
            nextOffset >= blob.size
                ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
                : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
        // eslint-disable-next-line no-await-in-loop -- secretstream chunks must be pushed in order
        const chunkBuffer = await blob.slice(offset, nextOffset).arrayBuffer();
        const encryptedChunk = sodium.crypto_secretstream_xchacha20poly1305_push(
            state,
            new Uint8Array(chunkBuffer),
            null,
            tag,
        );
        frames.push(frameEncryptedChunk(encryptedChunk));
    }
    return frames;
}

function decryptFramedChunks(bytes: Uint8Array, state: StateAddress): Uint8Array<ArrayBuffer>[] {
    const messages: Uint8Array<ArrayBuffer>[] = [];
    let offset = 0;
    while (offset < bytes.byteLength) {
        const chunkLength = readFrameLength(bytes, offset);
        const chunkStart = offset + 4;
        const chunkEnd = chunkStart + chunkLength;
        const pulled = sodium.crypto_secretstream_xchacha20poly1305_pull(
            state,
            bytes.slice(chunkStart, chunkEnd),
            null,
        );
        if (!pulled) {
            throw new Error("Unable to decrypt proximity file transfer");
        }
        messages.push(pulled.message.slice());
        offset = chunkEnd;
    }
    return messages;
}

function frameEncryptedChunk(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
    const frame = new Uint8Array(4 + bytes.byteLength);
    new DataView(frame.buffer).setUint32(0, bytes.byteLength, false);
    frame.set(bytes, 4);
    return frame;
}

function readFrameLength(bytes: Uint8Array, offset: number): number {
    if (offset + 4 > bytes.byteLength) {
        throw new Error("Unable to decrypt proximity file transfer");
    }
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}
