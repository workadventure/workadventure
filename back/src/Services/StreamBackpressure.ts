import {
    BACK_STREAM_BACKPRESSURE_DRAIN_TIMEOUT_MS,
    BACK_STREAM_BACKPRESSURE_MAX_QUEUED_BYTES,
    BACK_STREAM_BACKPRESSURE_MAX_QUEUED_MESSAGES,
} from "../Enum/EnvironmentVariable";
import { BackpressureWriter, type BackpressureWriteOptions, type WritableTarget } from "./BackpressureWriter";

const writers = new WeakMap<object, BackpressureWriter<unknown>>();

export function writeWithBackpressure<T>(
    stream: WritableTarget<T>,
    message: T,
    options: BackpressureWriteOptions = {},
    streamName = "back_stream"
): boolean {
    return getBackpressureWriter(stream, streamName).write(message, options);
}

function getBackpressureWriter<T>(stream: WritableTarget<T>, streamName: string): BackpressureWriter<T> {
    const existingWriter = writers.get(stream);
    if (existingWriter) {
        return existingWriter as BackpressureWriter<T>;
    }

    const writer = new BackpressureWriter<T>(stream, {
        maxQueuedMessages: BACK_STREAM_BACKPRESSURE_MAX_QUEUED_MESSAGES,
        maxQueuedBytes: BACK_STREAM_BACKPRESSURE_MAX_QUEUED_BYTES,
        drainTimeoutMs: BACK_STREAM_BACKPRESSURE_DRAIN_TIMEOUT_MS,
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
