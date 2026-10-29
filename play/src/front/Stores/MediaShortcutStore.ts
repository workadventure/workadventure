import { writable } from "svelte/store";

export type MediaShortcutAction = "microphone" | "camera";
export type MediaShortcut = { key: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean };

const storageKey = "mediaShortcuts";
const defaults: Record<MediaShortcutAction, MediaShortcut> = {
    microphone: { key: "KeyA", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false },
    camera: { key: "KeyV", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false },
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
export function setMediaShortcut(action: MediaShortcutAction, shortcut: MediaShortcut): void {
    shortcuts = { ...shortcuts, [action]: shortcut };
    localStorage.setItem(storageKey, JSON.stringify(shortcuts));
}
export function mediaShortcutMatches(event: KeyboardEvent, shortcut: MediaShortcut): boolean {
    return (
        event.code === shortcut.key &&
        event.ctrlKey === shortcut.ctrlKey &&
        event.altKey === shortcut.altKey &&
        event.shiftKey === shortcut.shiftKey &&
        event.metaKey === shortcut.metaKey
    );
}
