import { z } from "zod";

const CHUNK_FRAME_MAGIC = new Uint8Array([0x57, 0x41, 0x46, 0x54]); // WAFT
const HEADER_LENGTH = CHUNK_FRAME_MAGIC.length + 2;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const ProximityFileTransferControlMessage = z.union([
    z.object({
        type: z.literal("proximity_file_request"),
        transferId: z.string(),
    }),
    z.object({
        type: z.literal("proximity_file_start"),
        transferId: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        size: z.number().nonnegative(),
        sha256: z.string().optional(),
        encryptionAlgorithm: z.literal("XCHACHA20-POLY1305").optional(),
        encryptionIv: z.string().optional(),
        plainMimeType: z.string().optional(),
    }),
    z.object({
        type: z.literal("proximity_file_key"),
        transferId: z.string(),
        rawKey: z.string(),
        encryptionIv: z.string().optional(),
        plainMimeType: z.string().optional(),
    }),
    z.object({
        type: z.literal("proximity_file_complete"),
        transferId: z.string(),
    }),
    z.object({
        type: z.literal("proximity_file_error"),
        transferId: z.string(),
        reason: z.string(),
    }),
]);

export type ProximityFileTransferControlMessage = z.infer<typeof ProximityFileTransferControlMessage>;

export type ProximityFileChunkFrame = {
    transferId: string;
    chunk: Uint8Array<ArrayBuffer>;
};

function toArrayBufferBackedUint8Array(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy;
}

export function encodeProximityFileChunkFrame(transferId: string, chunk: Uint8Array): Uint8Array<ArrayBuffer> {
    const encodedTransferId = textEncoder.encode(transferId);
    if (encodedTransferId.length > 0xffff) {
        throw new Error("Transfer id is too long");
    }

    const frame = new Uint8Array(HEADER_LENGTH + encodedTransferId.length + chunk.byteLength);
    frame.set(CHUNK_FRAME_MAGIC, 0);
    const view = new DataView(frame.buffer);
    view.setUint16(CHUNK_FRAME_MAGIC.length, encodedTransferId.length, false);
    frame.set(encodedTransferId, HEADER_LENGTH);
    frame.set(chunk, HEADER_LENGTH + encodedTransferId.length);
    return frame;
}

export function decodeProximityFileChunkFrame(frame: ArrayBuffer | ArrayBufferView): ProximityFileChunkFrame {
    const bytes =
        frame instanceof ArrayBuffer
            ? new Uint8Array(frame)
            : new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength);
    if (bytes.byteLength < HEADER_LENGTH) {
        throw new Error("Invalid proximity file chunk frame");
    }

    for (let i = 0; i < CHUNK_FRAME_MAGIC.length; i++) {
        if (bytes[i] !== CHUNK_FRAME_MAGIC[i]) {
            throw new Error("Invalid proximity file chunk frame");
        }
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const transferIdLength = view.getUint16(CHUNK_FRAME_MAGIC.length, false);
    const chunkOffset = HEADER_LENGTH + transferIdLength;
    if (bytes.byteLength < chunkOffset) {
        throw new Error("Invalid proximity file chunk frame");
    }

    return {
        transferId: textDecoder.decode(bytes.subarray(HEADER_LENGTH, chunkOffset)),
        chunk: toArrayBufferBackedUint8Array(bytes.subarray(chunkOffset)),
    };
}

export function encodeProximityFileControlMessage(message: ProximityFileTransferControlMessage): string {
    return JSON.stringify(message);
}

export function decodeProximityFileControlMessage(message: string): ProximityFileTransferControlMessage {
    return ProximityFileTransferControlMessage.parse(JSON.parse(message));
}
