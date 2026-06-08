type SendStatus = number;
type BackpressurePriority = "critical" | "volatile";
type BackpressureCloseReason =
    | "queue_limit_exceeded"
    | "drain_timeout"
    | "target_closed"
    | "target_error"
    | "write_after_close";
type BackpressureDropReason = "volatile_coalesced" | "volatile_queue_limit";
type BackpressureWriteOptions = {
    priority?: BackpressurePriority;
    coalesceKey?: string;
};

type AdminWebSocketTarget = {
    send: (payload: string) => SendStatus;
    end: (code?: number, shortMessage?: string) => void;
};

type AdminWebSocketBackpressureWriterOptions = {
    maxQueuedMessages: number;
    maxQueuedBytes: number;
    drainTimeoutMs: number;
    estimateSize?: (message: string) => number;
    onDropped?: (reason: BackpressureDropReason, priority: BackpressurePriority) => void;
    onClosed?: (reason: BackpressureCloseReason | "send_dropped") => void;
};

type QueuedPayload = {
    payload: string;
    priority: BackpressurePriority;
    coalesceKey?: string;
    size: number;
};

export class AdminWebSocketBackpressureWriter {
    private queue: QueuedPayload[] = [];
    private queuedBytes = 0;
    private waitingForDrain = false;
    private closed = false;
    private drainTimeout: NodeJS.Timeout | undefined;

    public constructor(
        private readonly socket: AdminWebSocketTarget,
        private readonly options: AdminWebSocketBackpressureWriterOptions,
    ) {}

    public send(payload: string, writeOptions: BackpressureWriteOptions = {}): SendStatus {
        if (this.closed) {
            return 2;
        }

        const message = this.toQueuedPayload(payload, writeOptions);
        if (this.waitingForDrain || this.queue.length > 0) {
            this.enqueue(message);
            return 0;
        }

        return this.sendNow(message);
    }

    public close(reason: BackpressureCloseReason | "send_dropped" = "target_closed"): void {
        this.closeWithReason(reason, false);
    }

    public handleDrain(): void {
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

            if (this.sendNow(message) !== 1) {
                return;
            }
        }
    }

    private toQueuedPayload(payload: string, writeOptions: BackpressureWriteOptions): QueuedPayload {
        return {
            payload,
            priority: writeOptions.priority ?? "critical",
            coalesceKey: writeOptions.coalesceKey,
            size: this.options.estimateSize?.(payload) ?? payload.length,
        };
    }

    private enqueue(message: QueuedPayload): void {
        if (message.priority === "volatile" && message.coalesceKey) {
            const existingIndex = this.queue.findIndex(
                (queued) => queued.priority === "volatile" && queued.coalesceKey === message.coalesceKey,
            );

            if (existingIndex !== -1) {
                this.queuedBytes += message.size - this.queue[existingIndex].size;
                this.queue[existingIndex] = message;
                this.options.onDropped?.("volatile_coalesced", "volatile");
                return;
            }
        }

        if (
            this.queue.length + 1 > this.options.maxQueuedMessages ||
            this.queuedBytes + message.size > this.options.maxQueuedBytes
        ) {
            if (message.priority === "volatile") {
                this.options.onDropped?.("volatile_queue_limit", "volatile");
                return;
            }

            this.closeTarget("queue_limit_exceeded");
            return;
        }

        this.queue.push(message);
        this.queuedBytes += message.size;
    }

    private sendNow(message: QueuedPayload): SendStatus {
        let status: SendStatus;
        try {
            status = this.socket.send(message.payload);
        } catch {
            this.closeWithReason("write_after_close", false);
            return 2;
        }
        if (status === 0) {
            this.waitForDrain();
        } else if (status === 2) {
            this.closeTarget("send_dropped");
        }
        return status;
    }

    private waitForDrain(): void {
        if (this.waitingForDrain || this.closed) {
            return;
        }

        this.waitingForDrain = true;
        this.drainTimeout = setTimeout(() => {
            this.closeTarget("drain_timeout");
        }, this.options.drainTimeoutMs);
    }

    private closeTarget(reason: BackpressureCloseReason | "send_dropped"): void {
        this.closeWithReason(reason, true);
    }

    private closeWithReason(reason: BackpressureCloseReason | "send_dropped", closeTarget: boolean): void {
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
        if (closeTarget) {
            try {
                this.socket.end(1013, "Backpressure limit exceeded");
            } catch {
                // The socket may already be closed by the time the writer reacts.
            }
        }
    }
}
