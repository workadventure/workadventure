export type NoncedMessage<TPayload> = {
    nonce: number;
    payload: TPayload;
};

type StoredNoncedMessage<TPayload> = NoncedMessage<TPayload> & {
    storedAt: number;
};

export class NoncedMessageStore<TPayload> {
    private readonly messages: StoredNoncedMessage<TPayload>[] = [];
    private readonly retentionMs: number;

    public constructor(retentionMs?: number) {
        this.retentionMs = retentionMs ?? 30_000;
    }

    public add(nonce: number, payload: TPayload): void {
        this.pruneExpired();
        this.messages.push({
            nonce,
            payload,
            storedAt: Date.now(),
        });
    }

    public getAll(): NoncedMessage<TPayload>[] {
        this.pruneExpired();
        return this.messages.map(({ nonce, payload }) => ({ nonce, payload }));
    }

    public getAfter(nonce: number): NoncedMessage<TPayload>[] {
        this.pruneExpired();
        return this.messages
            .filter((message) => message.nonce > nonce)
            .map(({ nonce, payload }) => ({ nonce, payload }));
    }

    public has(nonce: number): boolean {
        this.pruneExpired();
        return this.messages.some((message) => message.nonce === nonce);
    }

    public hasEveryNonceAfter(lastReceivedNonce: number): boolean {
        this.pruneExpired();
        const firstMessage = this.messages[0];
        if (!firstMessage) {
            return true;
        }
        return firstMessage.nonce <= lastReceivedNonce + 1;
    }

    public clear(): void {
        this.messages.length = 0;
    }

    private pruneExpired(): void {
        if (this.messages.length === 0) return;

        const cutoff = Date.now() - this.retentionMs;
        while (this.messages.length > 0) {
            const firstMessage = this.messages[0];
            if (!firstMessage || firstMessage.storedAt > cutoff) {
                break;
            }
            this.messages.shift();
        }
    }
}
