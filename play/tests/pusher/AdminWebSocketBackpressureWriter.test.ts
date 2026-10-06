import { describe, expect, it, vi } from "vitest";
import { AdminWebSocketBackpressureWriter } from "../../src/pusher/services/AdminWebSocketBackpressureWriter";

type SendStatus = 0 | 1 | 2;

class FakeAdminSocket {
    public readonly sent: string[] = [];
    public readonly end = vi.fn();
    private drainHandler: (() => void) | undefined;
    private nextStatuses: SendStatus[] = [];

    public pushStatus(status: SendStatus): void {
        this.nextStatuses.push(status);
    }

    public send(payload: string): SendStatus {
        this.sent.push(payload);
        return this.nextStatuses.shift() ?? 1;
    }

    public onDrain(handler: () => void): void {
        this.drainHandler = handler;
    }

    public drain(): void {
        this.drainHandler?.();
    }
}

describe("AdminWebSocketBackpressureWriter", () => {
    it("queues following messages after uWS reports backpressure and flushes them on drain", () => {
        const socket = new FakeAdminSocket();
        const writer = new AdminWebSocketBackpressureWriter(socket, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
        });
        socket.onDrain(() => writer.handleDrain());
        socket.pushStatus(0);

        expect(writer.send("first")).toBe(0);
        expect(writer.send("second")).toBe(0);
        expect(writer.send("third")).toBe(0);
        expect(socket.sent).toEqual(["first"]);

        socket.drain();

        expect(socket.sent).toEqual(["first", "second", "third"]);
    });

    it("closes the socket when uWS drops a message due to maxBackpressure", () => {
        const socket = new FakeAdminSocket();
        const onClosed = vi.fn();
        const writer = new AdminWebSocketBackpressureWriter(socket, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
            onClosed,
        });
        socket.pushStatus(2);

        expect(writer.send("first")).toBe(2);

        expect(socket.end).toHaveBeenCalledWith(1013, "Backpressure limit exceeded");
        expect(onClosed).toHaveBeenCalledWith("send_dropped");
    });

    it("does not send after the writer is closed externally", () => {
        const socket = new FakeAdminSocket();
        const writer = new AdminWebSocketBackpressureWriter(socket, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
        });

        writer.close("target_closed");

        expect(writer.send("late")).toBe(2);
        expect(socket.sent).toEqual([]);
        expect(socket.end).not.toHaveBeenCalled();
    });

    it("clears queued messages and ignores late drain after external close", () => {
        const socket = new FakeAdminSocket();
        const writer = new AdminWebSocketBackpressureWriter(socket, {
            maxQueuedMessages: 10,
            maxQueuedBytes: 1024,
            drainTimeoutMs: 1000,
            estimateSize: (message) => message.length,
        });
        socket.onDrain(() => writer.handleDrain());
        socket.pushStatus(0);

        expect(writer.send("first")).toBe(0);
        expect(writer.send("second")).toBe(0);

        writer.close("target_closed");
        socket.drain();

        expect(socket.sent).toEqual(["first"]);
        expect(socket.end).not.toHaveBeenCalled();
    });
});
