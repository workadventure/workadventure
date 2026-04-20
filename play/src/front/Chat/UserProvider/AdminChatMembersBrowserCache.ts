import type { ChatMember } from "@workadventure/messages";

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const SESSION_STORAGE_KEY_PREFIX = "wa:adminChatMembers:";

export type AdminChatMembersBrowserCacheOptions = {
    /** Time-to-live for cached entries (default: 5 minutes). */
    ttlMs?: number;
    /**
     * Suffix for the sessionStorage key (e.g. room path). Defaults to `window.location.pathname` in the browser.
     */
    scopeKey?: string;
};

/**
 * In-memory + sessionStorage cache for the full admin chat members list (empty search only).
 * Entries expire after {@link AdminChatMembersBrowserCacheOptions.ttlMs}.
 */
export class AdminChatMembersBrowserCache {
    private memory: { members: ChatMember[]; cachedAt: number } | undefined;

    /** Returns cached members if still fresh, otherwise `undefined`. */
    get(): ChatMember[] | undefined {
        const now = Date.now();
        if (this.memory !== undefined && now - this.memory.cachedAt < DEFAULT_TTL_MS) {
            return this.memory.members;
        }
        const persisted = this.readPersisted();
        if (persisted !== undefined && now - persisted.cachedAt < DEFAULT_TTL_MS) {
            this.memory = persisted;
            return persisted.members;
        }
        return undefined;
    }

    /** Stores members with the current timestamp in memory and sessionStorage. */
    set(members: ChatMember[]): void {
        const cachedAt = Date.now();
        this.memory = { members, cachedAt };
        this.writePersisted(members, cachedAt);
    }

    private getStorageKey(): string {
        const scope = typeof window !== "undefined" ? window.location.pathname : "";
        return SESSION_STORAGE_KEY_PREFIX + scope;
    }

    private readPersisted(): { members: ChatMember[]; cachedAt: number } | undefined {
        try {
            if (typeof sessionStorage === "undefined") {
                return undefined;
            }
            const key = this.getStorageKey();
            const raw = sessionStorage.getItem(key);
            if (!raw) {
                return undefined;
            }
            const parsed = JSON.parse(raw) as { ts: number; members: ChatMember[] };
            if (Date.now() - parsed.ts > DEFAULT_TTL_MS) {
                sessionStorage.removeItem(key);
                return undefined;
            }
            return { members: parsed.members, cachedAt: parsed.ts };
        } catch {
            return undefined;
        }
    }

    private writePersisted(members: ChatMember[], cachedAt: number): void {
        try {
            if (typeof sessionStorage === "undefined") {
                return;
            }
            sessionStorage.setItem(this.getStorageKey(), JSON.stringify({ ts: cachedAt, members }));
        } catch {
            // ignore quota / private mode
        }
    }
}
