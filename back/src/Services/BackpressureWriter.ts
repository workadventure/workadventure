import { asError } from "catch-unknown";

export type BackpressureWriteCallback = (...args: unknown[]) => void;

export type WritableTarget<T> = {
    write: (chunk: T, callback?: BackpressureWriteCallback) => boolean;
    once: (event: "drain", listener: () => void) => unknown;
    end?: () => void;
    destroy?: (error?: Error) => void;
};

export type BackpressurePriority = "critical" | "volatile";
export type BackpressureCloseReason =
    | "queue_limit_exceeded"
    | "drain_timeout"
    | "target_closed"
    | "target_error"
    | "write_after_close";
export type BackpressureDropReason = "volatile_coalesced" | "volatile_queue_limit";

export class BackpressureWriterClosedError extends Error {
    public constructor(public readonly reason: BackpressureCloseReason) {
        super(`Backpressure writer closed: ${reason}`);
        this.name = "BackpressureWriterClosedError";
    }
}

export type BackpressureWriterOptions<T> = {
    maxQueuedMessages: number;
    maxQueuedBytes: number;
    drainTimeoutMs: number;
    estimateSize?: (message: T) => number;
    onDropped?: (reason: BackpressureDropReason, priority: BackpressurePriority) => void;
    onClosed?: (reason: BackpressureCloseReason) => void;
};

export type BackpressureWriteOptions = {
    priority?: BackpressurePriority;
    coalesceKey?: string;
    callback?: BackpressureWriteCallback;
};

type QueuedMessage<T> = {
    chunk: T;
    priority: BackpressurePriority;
    coalesceKey?: string;
    size: number;
    callback?: BackpressureWriteCallback;
};

export class BackpressureWriter<T> {
    private queue: QueuedMessage<T>[] = [];
    private queuedBytes = 0;
    private waitingForDrain = false;
    private closed = false;
    private closeError: Error | undefined;
    private drainTimeout: NodeJS.Timeout | undefined;

    public constructor(
        private readonly target: WritableTarget<T>,
        private readonly options: BackpressureWriterOptions<T>
    ) {}

    public write(chunk: T, writeOptions: BackpressureWriteOptions = {}): boolean {
        if (this.closed) {
            writeOptions.callback?.(this.closeError ?? createCloseError("target_closed"));
            return false;
        }

        const message = this.toQueuedMessage(chunk, writeOptions);

        if (this.waitingForDrain || this.queue.length > 0) {
            return this.enqueue(message);
        }

        return this.writeNow(message);
    }

    public close(reason: BackpressureCloseReason): void {
        this.closeWithReason(reason, false);
    }

    private toQueuedMessage(chunk: T, writeOptions: BackpressureWriteOptions): QueuedMessage<T> {
        return {
            chunk,
            priority: writeOptions.priority ?? "critical",
            coalesceKey: writeOptions.coalesceKey,
            size: this.options.estimateSize?.(chunk) ?? 1,
            callback: writeOptions.callback,
        };
    }

    private enqueue(message: QueuedMessage<T>): boolean {
        if (message.priority === "volatile" && message.coalesceKey) {
            const existingIndex = this.queue.findIndex(
                (queued) => queued.priority === "volatile" && queued.coalesceKey === message.coalesceKey
            );

            if (existingIndex !== -1) {
                this.queuedBytes += message.size - this.queue[existingIndex].size;
                this.queue[existingIndex] = message;
                this.options.onDropped?.("volatile_coalesced", "volatile");
                return false;
            }
        }

        if (
            this.queue.length + 1 > this.options.maxQueuedMessages ||
            this.queuedBytes + message.size > this.options.maxQueuedBytes
        ) {
            if (message.priority === "volatile") {
                this.options.onDropped?.("volatile_queue_limit", "volatile");
                return false;
            }

            const error = createCloseError("queue_limit_exceeded");
            message.callback?.(error);
            this.closeTarget("queue_limit_exceeded", error);
            return false;
        }

        this.queue.push(message);
        this.queuedBytes += message.size;
        return false;
    }

    private writeNow(message: QueuedMessage<T>): boolean {
        let acceptedWithoutBackpressure: boolean;
        try {
            acceptedWithoutBackpressure =
                message.callback === undefined
                    ? this.target.write(message.chunk)
                    : this.target.write(message.chunk, message.callback);
        } catch (error) {
            const writeError = asError(error);
            const reason = isWriteAfterCloseError(writeError) ? "write_after_close" : "target_error";
            message.callback?.(writeError);
            this.closeWithReason(reason, false, writeError);
            return false;
        }
        if (acceptedWithoutBackpressure === false) {
            this.waitForDrain();
        }
        return acceptedWithoutBackpressure !== false;
    }

    private waitForDrain(): void {
        if (this.waitingForDrain || this.closed) {
            return;
        }

        this.waitingForDrain = true;
        this.target.once("drain", () => this.handleDrain());
        this.drainTimeout = setTimeout(() => {
            this.closeTarget("drain_timeout");
        }, this.options.drainTimeoutMs);
    }

    private handleDrain(): void {
        if (this.closed) {
            return;
        }

        this.waitingForDrain = false;
        if (this.drainTimeout) {
            clearTimeout(this.drainTimeout);
            this.drainTimeout = undefined;
        }

        while (this.queue.length > 0) {
            const message = this.queue.shift();
            if (!message) {
                return;
            }
            this.queuedBytes -= message.size;

            if (!this.writeNow(message)) {
                return;
            }
        }
    }

    private closeTarget(reason: BackpressureCloseReason, error = createCloseError(reason)): void {
        this.closeWithReason(reason, true, error);
    }

    private closeWithReason(
        reason: BackpressureCloseReason,
        closeTarget: boolean,
        error = createCloseError(reason)
    ): void {
        if (this.closed) {
            return;
        }

        this.closed = true;
        this.closeError = error;
        this.flushQueuedCallbacks(error);
        this.queue = [];
        this.queuedBytes = 0;
        if (this.drainTimeout) {
            clearTimeout(this.drainTimeout);
            this.drainTimeout = undefined;
        }
        this.options.onClosed?.(reason);
        if (closeTarget) {
            this.closeWritableTarget(error);
        }
    }

    private flushQueuedCallbacks(error: Error): void {
        for (const message of this.queue) {
            message.callback?.(error);
        }
    }

    private closeWritableTarget(error: Error): void {
        try {
            if (this.target.end) {
                this.target.end();
            } else {
                this.target.destroy?.(error);
            }
        } catch {
            // The target may already be closed when backpressure decides to close it.
        }
    }
}

function createCloseError(reason: BackpressureCloseReason): Error {
    return new BackpressureWriterClosedError(reason);
}

function isWriteAfterCloseError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
        message.includes("write after end") ||
        message.includes("write after close") ||
        message.includes("stream has been ended") ||
        message.includes("call already closed") ||
        message.includes("destroyed") ||
        message.includes("cancelled")
    );
}
