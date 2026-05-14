import { EventEmitter } from "events";
import { describe, expect, it, vi } from "vitest";
import { BackpressureWriter } from "../../src/pusher/services/BackpressureWriter";

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

    it("coalesces volatile messages with the same key while blocked", () => {
        const stream = new FakeWritable<string>();
        const onDropped = vi.fn();
        const writer = new BackpressureWriter(stream, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
            onDropped,
        });

        stream.setNextWriteResult(false);

        writer.write("first");
        writer.write("move-1", { priority: "volatile", coalesceKey: "user:1" });
        writer.write("move-2", { priority: "volatile", coalesceKey: "user:1" });
        stream.emit("drain");

        expect(stream.written).toEqual(["first", "move-2"]);
        expect(onDropped).toHaveBeenCalledWith("volatile_coalesced", "volatile");
    });

    it("ends the stream when critical queued messages exceed the queue limits", () => {
        const stream = new FakeWritable<string>();
        const onClosed = vi.fn();
        const writer = new BackpressureWriter(stream, {
            maxQueuedMessages: 1,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
            onClosed,
        });

        stream.setNextWriteResult(false);

        writer.write("first");
        writer.write("second");
        writer.write("third");

        expect(stream.writable).toBe(false);
        expect(onClosed).toHaveBeenCalledWith("queue_limit_exceeded");
    });
});
