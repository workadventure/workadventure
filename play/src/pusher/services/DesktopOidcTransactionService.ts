import type { RedisClient } from "./RedisClient";

const DESKTOP_OIDC_TRANSACTION_TTL_SECONDS = 600;
const DESKTOP_OIDC_TRANSACTION_PREFIX = "desktop-oidc:";

export type DesktopOidcTransactionPayload = {
    playUri: string;
    codeVerifier: string;
    callbackUrl?: string;
    desktop: true;
};

const MAX_MEMORY_ENTRIES = 10_000;

type RedisLike = Pick<RedisClient, "getDel" | "set">;

type DesktopOidcTransactionServiceOptions = {
    getRedisClient?: () => Promise<RedisLike | null>;
    now?: () => number;
    ttlSeconds?: number;
};

type MemoryEntry = {
    payload: DesktopOidcTransactionPayload;
    expiresAt: number;
};

async function getDefaultRedisClient(): Promise<RedisLike | null> {
    const { getRedisClient } = await import("./RedisClient");
    return getRedisClient();
}

export class DesktopOidcTransactionService {
    private readonly memoryTransactions = new Map<string, MemoryEntry>();
    private readonly getRedisClient: () => Promise<RedisLike | null>;
    private readonly now: () => number;
    private readonly ttlSeconds: number;

    public constructor(options: DesktopOidcTransactionServiceOptions = {}) {
        this.getRedisClient = options.getRedisClient ?? getDefaultRedisClient;
        this.now = options.now ?? Date.now;
        this.ttlSeconds = options.ttlSeconds ?? DESKTOP_OIDC_TRANSACTION_TTL_SECONDS;
    }

    public async createDesktopOidcTransaction(
        state: string,
        payload: Omit<DesktopOidcTransactionPayload, "desktop">,
    ): Promise<void> {
        const transactionPayload: DesktopOidcTransactionPayload = {
            ...payload,
            desktop: true,
        };
        const redis = await this.getRedisClient();

        if (redis) {
            await redis.set(this.getRedisKey(state), JSON.stringify(transactionPayload), { EX: this.ttlSeconds });
            return;
        }

        this.purgeExpired();
        this.memoryTransactions.set(state, {
            payload: transactionPayload,
            expiresAt: this.now() + this.ttlSeconds * 1000,
        });
    }

    public async exchangeDesktopOidcTransaction(
        state: string | undefined,
    ): Promise<DesktopOidcTransactionPayload | undefined> {
        if (!state) {
            return undefined;
        }

        const redis = await this.getRedisClient();
        if (redis) {
            // GETDEL, not GET then DEL: two concurrent exchanges must not both read the entry.
            const serializedPayload = await redis.getDel(this.getRedisKey(state));
            if (!serializedPayload) {
                return undefined;
            }

            return this.parsePayload(serializedPayload);
        }

        const entry = this.memoryTransactions.get(state);
        if (!entry) {
            return undefined;
        }

        this.memoryTransactions.delete(state);
        if (entry.expiresAt <= this.now()) {
            return undefined;
        }

        return entry.payload;
    }

    /** Without Redis, entries nobody exchanges would otherwise stay in memory forever. */
    private purgeExpired(): void {
        const now = this.now();
        for (const [key, entry] of this.memoryTransactions) {
            if (entry.expiresAt <= now) {
                this.memoryTransactions.delete(key);
            }
        }
        // Unauthenticated requests create entries: cap the map, dropping the oldest (insertion order).
        // ponytail: a flood still evicts real logins in progress; Redis is the answer at that scale.
        while (this.memoryTransactions.size >= MAX_MEMORY_ENTRIES) {
            const oldest = this.memoryTransactions.keys().next().value;
            if (oldest === undefined) {
                break;
            }
            this.memoryTransactions.delete(oldest);
        }
    }

    private getRedisKey(state: string): string {
        return `${DESKTOP_OIDC_TRANSACTION_PREFIX}${state}`;
    }

    private parsePayload(serializedPayload: string): DesktopOidcTransactionPayload | undefined {
        try {
            const payload = JSON.parse(serializedPayload) as Partial<DesktopOidcTransactionPayload>;
            if (
                typeof payload.playUri !== "string" ||
                typeof payload.codeVerifier !== "string" ||
                (payload.callbackUrl !== undefined && typeof payload.callbackUrl !== "string") ||
                payload.desktop !== true
            ) {
                return undefined;
            }

            return {
                playUri: payload.playUri,
                codeVerifier: payload.codeVerifier,
                callbackUrl: payload.callbackUrl,
                desktop: true,
            };
        } catch {
            return undefined;
        }
    }
}

export const desktopOidcTransactionService = new DesktopOidcTransactionService();
