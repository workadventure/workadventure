import {
    PUSHER_STREAM_BACKPRESSURE_DRAIN_TIMEOUT_MS,
    PUSHER_STREAM_BACKPRESSURE_MAX_QUEUED_BYTES,
    PUSHER_STREAM_BACKPRESSURE_MAX_QUEUED_MESSAGES,
} from "../enums/EnvironmentVariable";
import {
    BackpressureWriter,
    type BackpressureCloseReason,
    type BackpressureWriteOptions,
    type WritableTarget,
} from "./BackpressureWriter";

const writers = new WeakMap<object, BackpressureWriter<unknown>>();

export function writeWithBackpressure<T>(
    stream: WritableTarget<T>,
    message: T,
    options: BackpressureWriteOptions = {},
    streamName = "pusher_stream"
): boolean {
    return getBackpressureWriter(stream, streamName).write(message, options);
}

export function closeBackpressureWriter<T>(
    stream: WritableTarget<T>,
    reason: BackpressureCloseReason = "target_closed"
): void {
    const existingWriter = writers.get(stream);
    existingWriter?.close(reason);
}

function getBackpressureWriter<T>(stream: WritableTarget<T>, streamName: string): BackpressureWriter<T> {
    const existingWriter = writers.get(stream);
    if (existingWriter) {
        return existingWriter as BackpressureWriter<T>;
    }

    const writer = new BackpressureWriter<T>(stream, {
        maxQueuedMessages: PUSHER_STREAM_BACKPRESSURE_MAX_QUEUED_MESSAGES,
        maxQueuedBytes: PUSHER_STREAM_BACKPRESSURE_MAX_QUEUED_BYTES,
        drainTimeoutMs: PUSHER_STREAM_BACKPRESSURE_DRAIN_TIMEOUT_MS,
        estimateSize,
        onDropped: (reason, priority) => {
            console.warn(`Backpressure dropped ${priority} message on ${streamName}: ${reason}`);
        },
        onClosed: (reason) => {
            console.warn(`Backpressure closed ${streamName}: ${reason}`);
        },
    });

    writers.set(stream, writer as BackpressureWriter<unknown>);
    return writer;
}

function estimateSize(message: unknown): number {
    if (typeof message === "string") {
        return Buffer.byteLength(message);
    }
    if (message instanceof Uint8Array) {
        return message.byteLength;
    }

    try {
        return Buffer.byteLength(JSON.stringify(message));
    } catch {
        return 1;
    }
}
