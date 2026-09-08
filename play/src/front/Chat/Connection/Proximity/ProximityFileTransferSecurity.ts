import sodium, { type StateAddress } from "libsodium-wrappers-sumo";

const PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE = 1024 * 1024;
const FRAME_LENGTH_PREFIX = 4;
// crypto_secretstream_xchacha20poly1305_ABYTES (17) + the length prefix of each frame.
const PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_OVERHEAD = 17 + FRAME_LENGTH_PREFIX;

export type ProximityFileTransferEncryptionMetadata = {
    algorithm: "XCHACHA20-POLY1305";
    iv: string;
    mimeType: string;
};

export type ProximityFileTransferEncryptionKey = Uint8Array;

export type EncryptedProximityFileBlob = {
    blob: Blob;
    metadata: ProximityFileTransferEncryptionMetadata;
    sha256: string;
};

/**
 * Wire size of an encrypted transfer for a plaintext of `plainSize` bytes: encrypted chunks travel
 * with a per-chunk overhead, so the announced size may legitimately be larger than the plaintext.
 * An empty file still produces one (final) frame.
 */
export function getMaxEncryptedTransferWireSize(plainSize: number): number {
    return (
        plainSize +
        Math.max(1, Math.ceil(plainSize / PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE)) *
            PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_OVERHEAD
    );
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

/**
 * Encrypts a blob into length-prefixed secretstream frames and hashes the plaintext in the same pass.
 */
export async function encryptProximityFileBlob(
    blob: Blob,
    key: ProximityFileTransferEncryptionKey,
): Promise<EncryptedProximityFileBlob> {
    await sodium.ready;
    const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
    const hasher = sodium.crypto_hash_sha256_init();
    const frames: Uint8Array<ArrayBuffer>[] = [];
    let offset = 0;
    do {
        const nextOffset = offset + PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE;
        const tag =
            nextOffset >= blob.size
                ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
                : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
        // eslint-disable-next-line no-await-in-loop -- secretstream chunks must be pushed in order
        const chunk = new Uint8Array(await blob.slice(offset, nextOffset).arrayBuffer());
        sodium.crypto_hash_sha256_update(hasher, chunk);
        frames.push(frameEncryptedChunk(sodium.crypto_secretstream_xchacha20poly1305_push(state, chunk, null, tag)));
        offset = nextOffset;
    } while (offset < blob.size);
    return {
        blob: new Blob(frames, { type: "application/octet-stream" }),
        metadata: {
            algorithm: "XCHACHA20-POLY1305",
            iv: sodium.to_base64(header, sodium.base64_variants.ORIGINAL),
            mimeType: blob.type,
        },
        sha256: sodium.crypto_hash_sha256_final(hasher, "hex"),
    };
}

/**
 * Decrypts and hashes a transfer as its bytes arrive, so the receiver never holds the whole
 * ciphertext and the whole plaintext at the same time. Frames may span several incoming chunks.
 */
export class ProximityFileStreamDecryptor {
    private readonly pending: Uint8Array[] = [];
    private pendingLength = 0;
    private frameLength: number | undefined;
    private readonly parts: Uint8Array<ArrayBuffer>[] = [];
    private finished = false;

    private constructor(
        private readonly state: StateAddress,
        private readonly hasher: StateAddress,
        private readonly mimeType: string,
    ) {}

    static async create(
        key: ProximityFileTransferEncryptionKey,
        metadata: ProximityFileTransferEncryptionMetadata,
    ): Promise<ProximityFileStreamDecryptor> {
        await sodium.ready;
        const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
            sodium.from_base64(metadata.iv, sodium.base64_variants.ORIGINAL),
            key,
        );
        return new ProximityFileStreamDecryptor(state, sodium.crypto_hash_sha256_init(), metadata.mimeType);
    }

    push(bytes: Uint8Array): void {
        this.pending.push(bytes);
        this.pendingLength += bytes.byteLength;
        for (;;) {
            if (this.frameLength === undefined) {
                if (this.pendingLength < FRAME_LENGTH_PREFIX) {
                    return;
                }
                const prefix = this.take(FRAME_LENGTH_PREFIX);
                this.frameLength = new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength).getUint32(
                    0,
                    false,
                );
            }
            if (this.pendingLength < this.frameLength) {
                return;
            }
            const pulled = sodium.crypto_secretstream_xchacha20poly1305_pull(
                this.state,
                this.take(this.frameLength),
                null,
            );
            this.frameLength = undefined;
            if (!pulled || this.finished) {
                throw new Error("Unable to decrypt proximity file transfer");
            }
            sodium.crypto_hash_sha256_update(this.hasher, pulled.message);
            this.parts.push(pulled.message as Uint8Array<ArrayBuffer>);
            this.finished = pulled.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL;
        }
    }

    finish(): { blob: Blob; sha256: string } {
        if (!this.finished || this.pendingLength !== 0) {
            throw new Error("Unable to decrypt proximity file transfer");
        }
        return {
            blob: new Blob(this.parts, { type: this.mimeType }),
            sha256: sodium.crypto_hash_sha256_final(this.hasher, "hex"),
        };
    }

    private take(length: number): Uint8Array<ArrayBuffer> {
        const out = new Uint8Array(length);
        let offset = 0;
        while (offset < length) {
            const chunk = this.pending[0];
            const needed = length - offset;
            if (chunk.byteLength <= needed) {
                out.set(chunk, offset);
                offset += chunk.byteLength;
                this.pending.shift();
            } else {
                out.set(chunk.subarray(0, needed), offset);
                this.pending[0] = chunk.subarray(needed);
                offset = length;
            }
        }
        this.pendingLength -= length;
        return out;
    }
}

function frameEncryptedChunk(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
    const frame = new Uint8Array(FRAME_LENGTH_PREFIX + bytes.byteLength);
    new DataView(frame.buffer).setUint32(0, bytes.byteLength, false);
    frame.set(bytes, FRAME_LENGTH_PREFIX);
    return frame;
}
