import settings from "./settings";
import {
    addWorldToHistory,
    formatWorldHistoryLabel,
    isRoomUrl,
    normalizePersistedLastRoomUrl,
} from "./desktop-url-policy";

export type RecentWorld = {
    url: string;
    label: string;
};

const historyChangeListeners = new Set<() => void>();

export function getRecentWorlds(): RecentWorld[] {
    return (settings.get("world_history") || []).map((url) => ({
        url,
        label: formatWorldHistoryLabel(url),
    }));
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
        for (const listener of historyChangeListeners) {
            listener();
        }
    }
}

export function onWorldHistoryChange(listener: () => void): () => void {
    historyChangeListeners.add(listener);
    return () => historyChangeListeners.delete(listener);
}
