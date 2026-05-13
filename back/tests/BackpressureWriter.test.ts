import { EventEmitter } from "events";
import { describe, expect, it, vi } from "vitest";
import { BackpressureWriter } from "../src/Services/BackpressureWriter";

class FakeWritable<T> extends EventEmitter {
    public readonly written: T[] = [];
    public writable = true;
    private nextWriteResult = true;

    public setNextWriteResult(result: boolean): void {
        this.nextWriteResult = result;
    }

    public write(chunk: T, callback?: (error?: Error | null) => void): boolean {
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
});
