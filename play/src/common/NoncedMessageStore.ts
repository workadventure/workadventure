export type NoncedMessage<TPayload> = {
    nonce: number;
    payload: TPayload;
};

type StoredNoncedMessage<TPayload> = NoncedMessage<TPayload> & {
    storedAt: number;
};

export class NoncedMessageStore<TPayload extends { byteLength: number }> {
    private readonly messages: StoredNoncedMessage<TPayload>[] = [];
    private storedBytes = 0;
    private lastAddedNonce = 0;

    public constructor(
        private readonly retentionMs = 30_000,
        private readonly maxMessages = Infinity,
        private readonly maxBytes = Infinity,
    ) {}

    /**
     * Returns false when this message takes the store over its caps. The store then drops everything it holds,
     * this message included, and hasEveryNonceAfter() refuses any resume that would need one of them.
     */
    public add(nonce: number, payload: TPayload): boolean {
        this.pruneExpired();
        this.messages.push({
            nonce,
            payload,
            storedAt: Date.now(),
        });
        this.storedBytes += payload.byteLength;
        this.lastAddedNonce = nonce;

        if (this.messages.length > this.maxMessages || this.storedBytes > this.maxBytes) {
            this.clear();
            return false;
        }
        return true;
    }

    public getAll(): NoncedMessage<TPayload>[] {
        this.pruneExpired();
        return this.messages.map(({ nonce, payload }) => ({ nonce, payload }));
    }

    public getAfter(nonce: number): NoncedMessage<TPayload>[] {
        this.pruneExpired();
        // Nonces are stored in increasing order: walk back from the end over the wanted tail only.
        let start = this.messages.length;
        while (start > 0 && this.messages[start - 1].nonce > nonce) {
            start--;
        }
        return this.messages.slice(start).map(({ nonce, payload }) => ({ nonce, payload }));
    }

    public hasEveryNonceAfter(lastReceivedNonce: number): boolean {
        this.pruneExpired();
        const firstMessage = this.messages[0];
        if (!firstMessage) {
            // Nothing left to replay: fine only if the peer got the last message ever added (it may have been dropped).
            return lastReceivedNonce >= this.lastAddedNonce;
        }
        return firstMessage.nonce <= lastReceivedNonce + 1;
    }

    public clear(): void {
        this.messages.length = 0;
        this.storedBytes = 0;
    }

    private pruneExpired(): void {
        const cutoff = Date.now() - this.retentionMs;
        let expired = 0;
        for (const message of this.messages) {
            if (message.storedAt > cutoff) {
                break;
            }
            this.storedBytes -= message.payload.byteLength;
            expired++;
        }
        this.messages.splice(0, expired);
    }
}
