import { writable } from "svelte/store";

export type MediaShortcutAction = "microphone" | "camera";
export type MediaShortcut = { key: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean };

const storageKey = "mediaShortcuts";
const defaults: Record<MediaShortcutAction, MediaShortcut> = {
    microphone: { key: "KeyO", ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
    camera: { key: "KeyP", ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
};

export const mediaShortcutRebindingStore = writable(false);

function load(): Record<MediaShortcutAction, MediaShortcut> {
    try {
        const value = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Partial<
            Record<MediaShortcutAction, MediaShortcut>
        > | null;
        return { ...defaults, ...value };
    } catch {
        return { ...defaults };
    }
}

let shortcuts = load();
export function getMediaShortcut(action: MediaShortcutAction): MediaShortcut {
    return shortcuts[action];
}
const sameShortcut = (a: MediaShortcut, b: MediaShortcut) =>
    a.key === b.key &&
    a.ctrlKey === b.ctrlKey &&
    a.altKey === b.altKey &&
    a.shiftKey === b.shiftKey &&
    a.metaKey === b.metaKey;

// Rebinding to a shortcut owned by the other action swaps them, so no shortcut is ever bound twice.
export function setMediaShortcut(action: MediaShortcutAction, shortcut: MediaShortcut): void {
    const other: MediaShortcutAction = action === "microphone" ? "camera" : "microphone";
    shortcuts = {
        ...shortcuts,
        [action]: shortcut,
        ...(sameShortcut(shortcuts[other], shortcut) ? { [other]: shortcuts[action] } : {}),
    };
    localStorage.setItem(storageKey, JSON.stringify(shortcuts));
}
export function mediaShortcutMatches(event: KeyboardEvent, shortcut: MediaShortcut): boolean {
    return (
        !event.repeat &&
        event.code === shortcut.key &&
        event.ctrlKey === shortcut.ctrlKey &&
        event.altKey === shortcut.altKey &&
        event.shiftKey === shortcut.shiftKey &&
        event.metaKey === shortcut.metaKey
    );
}
