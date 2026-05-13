export type BackpressureWriteCallback = (...args: unknown[]) => void;

export type WritableTarget<T> = {
    write: (chunk: T, callback?: BackpressureWriteCallback) => boolean;
    once: (event: "drain", listener: () => void) => unknown;
    end?: () => void;
    destroy?: (error?: Error) => void;
};

export type BackpressurePriority = "critical" | "volatile";
export type BackpressureCloseReason = "queue_limit_exceeded" | "drain_timeout";
export type BackpressureDropReason = "volatile_coalesced" | "volatile_queue_limit";

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
    private drainTimeout: NodeJS.Timeout | undefined;

    public constructor(
        private readonly target: WritableTarget<T>,
        private readonly options: BackpressureWriterOptions<T>
    ) {}

    public write(chunk: T, writeOptions: BackpressureWriteOptions = {}): boolean {
        if (this.closed) {
            return false;
        }

        const message = this.toQueuedMessage(chunk, writeOptions);

        if (this.waitingForDrain || this.queue.length > 0) {
            return this.enqueue(message);
        }

        return this.writeNow(message);
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

            this.close("queue_limit_exceeded");
            return false;
        }

        this.queue.push(message);
        this.queuedBytes += message.size;
        return false;
    }

    private writeNow(message: QueuedMessage<T>): boolean {
        const acceptedWithoutBackpressure =
            message.callback === undefined
                ? this.target.write(message.chunk)
                : this.target.write(message.chunk, message.callback);
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
            this.close("drain_timeout");
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

    private close(reason: BackpressureCloseReason): void {
        if (this.closed) {
            return;
        }

        this.closed = true;
        this.queue = [];
        this.queuedBytes = 0;
        if (this.drainTimeout) {
            clearTimeout(this.drainTimeout);
            this.drainTimeout = undefined;
        }
        this.options.onClosed?.(reason);
        if (this.target.end) {
            this.target.end();
        } else {
            this.target.destroy?.(new Error(reason));
        }
    }
}
