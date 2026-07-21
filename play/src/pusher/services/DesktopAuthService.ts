import { v4 } from "uuid";
import type { RedisClient } from "./RedisClient";

const DESKTOP_AUTH_CODE_TTL_SECONDS = 300;
const DESKTOP_AUTH_CODE_PREFIX = "desktop-auth:";

export type DesktopAuthPayload = {
    token: string;
    targetUrl: string;
};

type RedisLike = Pick<RedisClient, "get" | "set" | "del">;

type DesktopAuthServiceOptions = {
    getRedisClient?: () => Promise<RedisLike | null>;
    now?: () => number;
    randomCode?: () => string;
    ttlSeconds?: number;
};

type MemoryEntry = {
    payload: DesktopAuthPayload;
    expiresAt: number;
};

async function getDefaultRedisClient(): Promise<RedisLike | null> {
    const { getRedisClient } = await import("./RedisClient");
    return getRedisClient();
}

export class DesktopAuthService {
    private readonly memoryCodes = new Map<string, MemoryEntry>();
    private readonly getRedisClient: () => Promise<RedisLike | null>;
    private readonly now: () => number;
    private readonly randomCode: () => string;
    private readonly ttlSeconds: number;

    public constructor(options: DesktopAuthServiceOptions = {}) {
        this.getRedisClient = options.getRedisClient ?? getDefaultRedisClient;
        this.now = options.now ?? Date.now;
        this.randomCode = options.randomCode ?? v4;
        this.ttlSeconds = options.ttlSeconds ?? DESKTOP_AUTH_CODE_TTL_SECONDS;
    }

    public async createDesktopAuthCode(payload: DesktopAuthPayload): Promise<string> {
        const code = this.randomCode();
        const redis = await this.getRedisClient();

        if (redis) {
            await redis.set(this.getRedisKey(code), JSON.stringify(payload), { EX: this.ttlSeconds });
            return code;
        }

        this.memoryCodes.set(code, {
            payload,
            expiresAt: this.now() + this.ttlSeconds * 1000,
        });
        return code;
    }

    public async exchangeDesktopAuthCode(code: string): Promise<DesktopAuthPayload | undefined> {
        if (!code) {
            return undefined;
        }

        const redis = await this.getRedisClient();
        if (redis) {
            const key = this.getRedisKey(code);
            const serializedPayload = await redis.get(key);
            if (!serializedPayload) {
                return undefined;
            }

            await redis.del(key);
            return this.parsePayload(serializedPayload);
        }

        const entry = this.memoryCodes.get(code);
        if (!entry) {
            return undefined;
        }

        this.memoryCodes.delete(code);
        if (entry.expiresAt <= this.now()) {
            return undefined;
        }

        return entry.payload;
    }

    private getRedisKey(code: string): string {
        return `${DESKTOP_AUTH_CODE_PREFIX}${code}`;
    }

    private parsePayload(serializedPayload: string): DesktopAuthPayload | undefined {
        try {
            const payload = JSON.parse(serializedPayload) as Partial<DesktopAuthPayload>;
            if (typeof payload.token !== "string" || typeof payload.targetUrl !== "string") {
                return undefined;
            }

            return {
                token: payload.token,
                targetUrl: payload.targetUrl,
            };
        } catch {
            return undefined;
        }
    }
}

export const desktopAuthService = new DesktopAuthService();
