import { EventEmitter } from "events";
import { describe, expect, it, vi } from "vitest";
import { BackpressureWriter, BackpressureWriterClosedError } from "../src/Services/BackpressureWriter";

class FakeWritable<T> extends EventEmitter {
    public readonly written: T[] = [];
    public writable = true;
    private nextWriteResult = true;
    private nextWriteError: Error | undefined;

    public setNextWriteResult(result: boolean): void {
        this.nextWriteResult = result;
    }

    public throwOnNextWrite(error: Error): void {
        this.nextWriteError = error;
    }

    public write(chunk: T, callback?: (error?: Error | null) => void): boolean {
        if (this.nextWriteError) {
            const error = this.nextWriteError;
            this.nextWriteError = undefined;
            throw error;
        }
        this.written.push(chunk);
        callback?.();
        const result = this.nextWriteResult;
        this.nextWriteResult = true;
        return result;
    }

    public end(): void {
        this.writable = false;
    }
}

describe("BackpressureWriter", () => {
    it("queues following messages while waiting for drain and flushes them in order", () => {
        const stream = new FakeWritable<string>();
        const writer = new BackpressureWriter(stream, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
        });

        stream.setNextWriteResult(false);

        expect(writer.write("first")).toBe(false);
        expect(writer.write("second")).toBe(false);
        expect(writer.write("third")).toBe(false);
        expect(stream.written).toEqual(["first"]);

        stream.emit("drain");

        expect(stream.written).toEqual(["first", "second", "third"]);
    });

    it("starts callbacks only when queued messages are actually written", () => {
        const stream = new FakeWritable<string>();
        const callback = vi.fn();
        const writer = new BackpressureWriter(stream, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
        });

        stream.setNextWriteResult(false);

        writer.write("first");
        writer.write("ping", { callback });

        expect(callback).not.toHaveBeenCalled();

        stream.emit("drain");

        expect(callback).toHaveBeenCalledOnce();
    });

    it("fails queued callbacks and ignores drain after the writer is closed", () => {
        const stream = new FakeWritable<string>();
        const callback = vi.fn();
        const writer = new BackpressureWriter(stream, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
        });

        stream.setNextWriteResult(false);

        writer.write("first");
        writer.write("second", { callback });
        writer.close("target_closed");
        stream.emit("drain");

        expect(callback).toHaveBeenCalledOnce();
        expect(callback.mock.calls[0][0]).toBeInstanceOf(BackpressureWriterClosedError);
        expect(stream.written).toEqual(["first"]);
    });

    it("fails callbacks immediately when writing after close", () => {
        const stream = new FakeWritable<string>();
        const callback = vi.fn();
        const writer = new BackpressureWriter(stream, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
        });

        writer.close("target_closed");

        expect(writer.write("late", { callback })).toBe(false);

        expect(callback).toHaveBeenCalledOnce();
        expect(callback.mock.calls[0][0]).toBeInstanceOf(BackpressureWriterClosedError);
        expect(stream.written).toEqual([]);
    });

    it("closes without throwing when the target throws write after end", () => {
        const stream = new FakeWritable<string>();
        const callback = vi.fn();
        const onClosed = vi.fn();
        const writer = new BackpressureWriter(stream, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
            onClosed,
        });
        stream.throwOnNextWrite(new Error("write after end"));

        expect(writer.write("late", { callback })).toBe(false);

        expect(callback).toHaveBeenCalledOnce();
        expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(onClosed).toHaveBeenCalledWith("write_after_close");
        expect(stream.written).toEqual([]);
    });
});
