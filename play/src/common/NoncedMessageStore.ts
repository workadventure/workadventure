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

        if (!Number.isInteger(nonce) || nonce < 0) {
            throw new Error(`Invalid nonce ${nonce}: expected a nonnegative integer`);
        }

        const lastNonce = this.messages[this.messages.length - 1]?.nonce;
        if (lastNonce !== undefined && nonce <= lastNonce) {
            throw new Error(`Invalid nonce ${nonce}: expected strictly greater than previous nonce ${lastNonce}`);
        }

        this.messages.push({
            nonce,
            payload,
            storedAt: Date.now(),
        });
    }

    public getAfter(nonce: number): NoncedMessage<TPayload>[] {
        this.pruneExpired();

        if (!Number.isInteger(nonce) || nonce < 0) {
            throw new Error(`Invalid nonce ${nonce}: expected a nonnegative integer`);
        }

        return this.messages
            .filter((message) => message.nonce > nonce)
            .map(({ nonce, payload }) => ({ nonce, payload }));
    }

    public has(nonce: number): boolean {
        this.pruneExpired();

        if (!Number.isInteger(nonce) || nonce < 0) {
            throw new Error(`Invalid nonce ${nonce}: expected a nonnegative integer`);
        }

        return this.messages.some((message) => message.nonce === nonce);
    }

    public hasEveryNonceAfter(lastReceivedNonce: number, latestSentNonce: number): boolean {
        this.pruneExpired();

        if (!Number.isInteger(lastReceivedNonce) || lastReceivedNonce < 0) {
            throw new Error(`Invalid nonce ${lastReceivedNonce}: expected a nonnegative integer`);
        }
        if (!Number.isInteger(latestSentNonce) || latestSentNonce < 0) {
            throw new Error(`Invalid nonce ${latestSentNonce}: expected a nonnegative integer`);
        }
        if (latestSentNonce <= lastReceivedNonce) {
            return true;
        }

        return this.has(lastReceivedNonce + 1);
    }

    public clearThrough(nonce: number): void {
        this.pruneExpired();

        if (!Number.isInteger(nonce) || nonce < 0) {
            throw new Error(`Invalid nonce ${nonce}: expected a nonnegative integer`);
        }

        if (this.messages.length === 0) {
            return;
        }

        const firstIndexToKeep = this.messages.findIndex((message) => message.nonce > nonce);
        if (firstIndexToKeep === -1) {
            this.messages.length = 0;
            return;
        }
        if (firstIndexToKeep === 0) {
            return;
        }

        this.messages.splice(0, firstIndexToKeep);
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
