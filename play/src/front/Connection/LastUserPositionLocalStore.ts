import type { PositionInterface } from "./ConnexionModels";

const STORAGE_KEY = "workadventure-lastPositions";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEBOUNCE_MS = 5_000; // 5 seconds after last movement

interface StoredPosition {
    x: number;
    y: number;
    savedAt: number;
}

type PositionsByRoom = Record<string, StoredPosition>;

let pendingSaveTimeout: ReturnType<typeof setTimeout> | undefined;

function readFromStorage(): PositionsByRoom {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as PositionsByRoom;
        return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

function writeToStorage(data: PositionsByRoom): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn("[LastPositionStore] Failed to write to localStorage", e);
    }
}

function savePosition(roomKey: string, x: number, y: number): void {
    const data = readFromStorage();
    data[roomKey] = { x, y, savedAt: Date.now() };
    writeToStorage(data);
}

/**
 * Returns the last saved position for a room if it exists and is within the TTL (30 days).
 */
export function getLastPosition(roomKey: string): PositionInterface | undefined {
    const data = readFromStorage();
    const entry = data[roomKey];
    if (!entry || typeof entry.x !== "number" || typeof entry.y !== "number") return undefined;
    if (Date.now() - entry.savedAt > TTL_MS) {
        delete data[roomKey];
        writeToStorage(data);
        return undefined;
    }
    return { x: entry.x, y: entry.y };
}

/**
 * Call this on every player movement (move, walkTo, follow, etc.).
 * Position is saved to localStorage 5 seconds after the last movement (debounced).
 */
export function onPlayerMoved(roomKey: string, x: number, y: number): void {
    if (pendingSaveTimeout) clearTimeout(pendingSaveTimeout);
    pendingSaveTimeout = setTimeout(() => {
        savePosition(roomKey, x, y);
        pendingSaveTimeout = undefined;
    }, DEBOUNCE_MS);
}

/**
 * Saves the position immediately (e.g. when reconnecting so a later page load uses it).
 */
export function savePositionImmediately(roomKey: string, x: number, y: number): void {
    if (pendingSaveTimeout) clearTimeout(pendingSaveTimeout);
    pendingSaveTimeout = undefined;
    savePosition(roomKey, x, y);
}
