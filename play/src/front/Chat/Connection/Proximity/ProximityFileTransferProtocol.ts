import { z } from "zod";

// Binary frames are `uint16 transferIdLength | transferId | chunk`; control messages travel as strings.
const HEADER_LENGTH = 2;

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
        size: z.number().nonnegative(),
    }),
    z.object({
        type: z.literal("proximity_file_key"),
        transferId: z.string(),
        rawKey: z.string(),
        iv: z.string(),
        mimeType: z.string(),
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

export function encodeProximityFileChunkFrame(transferId: string, chunk: Uint8Array): Uint8Array<ArrayBuffer> {
    const encodedTransferId = textEncoder.encode(transferId);
    if (encodedTransferId.length > 0xffff) {
        throw new Error("Transfer id is too long");
    }

    const frame = new Uint8Array(HEADER_LENGTH + encodedTransferId.length + chunk.byteLength);
    new DataView(frame.buffer).setUint16(0, encodedTransferId.length, false);
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

    const transferIdLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(0, false);
    const chunkOffset = HEADER_LENGTH + transferIdLength;
    if (bytes.byteLength < chunkOffset) {
        throw new Error("Invalid proximity file chunk frame");
    }

    return {
        transferId: textDecoder.decode(bytes.subarray(HEADER_LENGTH, chunkOffset)),
        chunk: bytes.slice(chunkOffset),
    };
}

export function decodeProximityFileControlMessage(message: string): ProximityFileTransferControlMessage {
    return ProximityFileTransferControlMessage.parse(JSON.parse(message));
}
