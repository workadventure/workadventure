import sodium, { type StateAddress } from "libsodium-wrappers-sumo";
import type { ProximityFileSink } from "./ProximityFileStorage";

const PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE = 1024 * 1024;
const FRAME_LENGTH_PREFIX = 4;
// crypto_secretstream_xchacha20poly1305_ABYTES (17) + the length prefix of each frame.
const PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_OVERHEAD = 17 + FRAME_LENGTH_PREFIX;

export type ProximityFileTransferEncryptionKey = Uint8Array;

/**
 * Exact wire size of an encrypted transfer for a plaintext of `plainSize` bytes: every 1 MB slice
 * becomes one length-prefixed secretstream frame, and an empty file still produces one (final) frame.
 */
export function getEncryptedTransferWireSize(plainSize: number): number {
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

/** SHA-256 of a blob, read slice by slice so the whole file never sits in memory. */
export async function hashProximityFileBlob(blob: Blob): Promise<string> {
    await sodium.ready;
    const hasher = sodium.crypto_hash_sha256_init();
    for (let offset = 0; offset < blob.size; offset += PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE) {
        // eslint-disable-next-line no-await-in-loop -- slices must be hashed in order
        const chunk = await blob.slice(offset, offset + PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE).arrayBuffer();
        sodium.crypto_hash_sha256_update(hasher, new Uint8Array(chunk));
    }
    return sodium.crypto_hash_sha256_final(hasher, "hex");
}

/**
 * Encrypts a blob into length-prefixed XChaCha20-Poly1305 secretstream frames, one 1 MB slice at a
 * time, so the sender only ever holds one slice in memory. One encryptor per recipient: the stream
 * header (`iv`) is fresh for every stream.
 */
export class ProximityFileStreamEncryptor {
    private constructor(
        private readonly state: StateAddress,
        readonly iv: string,
    ) {}

    static async create(key: ProximityFileTransferEncryptionKey): Promise<ProximityFileStreamEncryptor> {
        await sodium.ready;
        const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
        return new ProximityFileStreamEncryptor(state, sodium.to_base64(header, sodium.base64_variants.ORIGINAL));
    }

    async *frames(blob: Blob): AsyncGenerator<Uint8Array<ArrayBuffer>> {
        let offset = 0;
        do {
            const nextOffset = offset + PROXIMITY_FILE_TRANSFER_ENCRYPTION_CHUNK_SIZE;
            const tag =
                nextOffset >= blob.size
                    ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
                    : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
            // eslint-disable-next-line no-await-in-loop -- secretstream chunks must be pushed in order
            const chunk = new Uint8Array(await blob.slice(offset, nextOffset).arrayBuffer());
            yield frameEncryptedChunk(sodium.crypto_secretstream_xchacha20poly1305_push(this.state, chunk, null, tag));
            offset = nextOffset;
        } while (offset < blob.size);
    }
}

/**
 * Decrypts and hashes a transfer as its bytes arrive, handing every decrypted frame to the sink
 * right away so the plaintext never accumulates in memory. Frames may span several incoming chunks.
 */
export class ProximityFileStreamDecryptor {
    private readonly pending: Uint8Array[] = [];
    private pendingLength = 0;
    private frameLength: number | undefined;
    private finished = false;

    private constructor(
        private readonly state: StateAddress,
        private readonly hasher: StateAddress,
        private readonly mimeType: string,
        private readonly sink: ProximityFileSink,
    ) {}

    static async create(
        key: ProximityFileTransferEncryptionKey,
        iv: string,
        mimeType: string,
        sink: ProximityFileSink,
    ): Promise<ProximityFileStreamDecryptor> {
        await sodium.ready;
        const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
            sodium.from_base64(iv, sodium.base64_variants.ORIGINAL),
            key,
        );
        return new ProximityFileStreamDecryptor(state, sodium.crypto_hash_sha256_init(), mimeType, sink);
    }

    async push(bytes: Uint8Array): Promise<void> {
        this.pending.push(bytes);
        this.pendingLength += bytes.byteLength;
        for (;;) {
            if (this.frameLength === undefined) {
                if (this.pendingLength < FRAME_LENGTH_PREFIX) {
                    return;
                }
                const prefix = this.take(FRAME_LENGTH_PREFIX);
                this.frameLength = new DataView(prefix.buffer).getUint32(0, false);
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
            this.finished = pulled.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL;
            // eslint-disable-next-line no-await-in-loop -- frames must be written in order
            await this.sink.write(pulled.message as Uint8Array<ArrayBuffer>);
        }
    }

    async finish(): Promise<{ blob: Blob; sha256: string }> {
        if (!this.finished || this.pendingLength !== 0) {
            throw new Error("Unable to decrypt proximity file transfer");
        }
        return {
            blob: await this.sink.finish(this.mimeType),
            sha256: sodium.crypto_hash_sha256_final(this.hasher, "hex"),
        };
    }

    discard(): Promise<void> {
        return this.sink.discard();
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
