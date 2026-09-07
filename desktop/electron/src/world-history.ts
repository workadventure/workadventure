import settings from "./settings";
import {
    addWorldToHistory,
    formatWorldHistoryLabel,
    isRoomUrl,
    normalizePersistedLastRoomUrl,
} from "./desktop-url-policy";

const MAX_PINNED_WORLDS = 12;

export type RecentWorld = {
    url: string;
    label: string;
    pinned: boolean;
};

const historyChangeListeners = new Set<() => void>();

function notifyChange(): void {
    for (const listener of historyChangeListeners) {
        listener();
    }
}

function getPinnedUrls(): string[] {
    return settings.get("pinned_worlds") || [];
}

export function isWorldPinned(url: string): boolean {
    const sanitized = normalizePersistedLastRoomUrl(url);
    return sanitized ? getPinnedUrls().includes(sanitized) : false;
}

export function getRecentWorlds(): RecentWorld[] {
    const pinned = new Set(getPinnedUrls());
    return (settings.get("world_history") || []).map((url) => ({
        url,
        label: formatWorldHistoryLabel(url),
        pinned: pinned.has(url),
    }));
}

/** Pinned worlds, in the user's pin order (most recently pinned first). */
export function getPinnedWorlds(): RecentWorld[] {
    return getPinnedUrls().map((url) => ({
        url,
        label: formatWorldHistoryLabel(url),
        pinned: true,
    }));
}

/** Pin a world (most-recent-first, deduped, capped). No-op for non-room URLs. */
export function pinWorld(url: string): void {
    const sanitized = normalizePersistedLastRoomUrl(url);
    if (!sanitized || !isRoomUrl(sanitized)) {
        return;
    }
    const current = getPinnedUrls();
    if (current[0] === sanitized) {
        return;
    }
    const next = [sanitized, ...current.filter((entry) => entry !== sanitized)].slice(0, MAX_PINNED_WORLDS);
    settings.set("pinned_worlds", next);
    notifyChange();
}

export function unpinWorld(url: string): void {
    const sanitized = normalizePersistedLastRoomUrl(url);
    if (!sanitized) {
        return;
    }
    const current = getPinnedUrls();
    if (!current.includes(sanitized)) {
        return;
    }
    settings.set(
        "pinned_worlds",
        current.filter((entry) => entry !== sanitized)
    );
    notifyChange();
}

/** Toggle pin state; returns the new state (true = now pinned). */
export function toggleWorldPin(url: string): boolean {
    if (isWorldPinned(url)) {
        unpinWorld(url);
        return false;
    }
    pinWorld(url);
    return isWorldPinned(url);
}

export function rememberWorldUrl(url: string): void {
    const sanitized = normalizePersistedLastRoomUrl(url);
    if (!sanitized || !isRoomUrl(sanitized)) {
        return;
    }

    const previousHistory = settings.get("world_history") || [];
    const nextHistory = addWorldToHistory(previousHistory, sanitized);
    const historyChanged =
        nextHistory.length !== previousHistory.length ||
        nextHistory.some((entry, index) => entry !== previousHistory[index]);
    const lastRoomChanged = settings.get("last_room_url") !== sanitized;

    if (!historyChanged && !lastRoomChanged) {
        return;
    }

    if (lastRoomChanged) {
        settings.set("last_room_url", sanitized);
    }
    if (historyChanged) {
        settings.set("world_history", nextHistory);
        notifyChange();
    }
}

export function onWorldHistoryChange(listener: () => void): () => void {
    historyChangeListeners.add(listener);
    return () => historyChangeListeners.delete(listener);
}
