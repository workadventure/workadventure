import { globalShortcut } from "electron";
import ElectronLog from "electron-log";
import settings, { SettingsData } from "./settings";
import { emitCameraToggle, emitMuteToggle } from "./ipc";
import { toggleCompanion } from "./companion-controller";
import type { ShortcutName } from "./shortcut-policy";

/** The shortcuts the OS or another app already owns: the settings window says so. */
let unavailable: ShortcutName[] = [];
const listeners = new Set<() => void>();

/**
 * Register one global accelerator, tolerating both failure modes Electron has here: `register`
 * returns false when the OS or another app already owns the combo, and it throws outright on a
 * malformed accelerator string (which a hand-edited settings file can produce). Either way the
 * shortcut silently would not fire, so log it — an unbound mute key is otherwise indistinguishable
 * from a broken one.
 */
function registerShortcut(name: ShortcutName, accelerator: string | undefined, handler: () => void): void {
    if (!accelerator || accelerator.length === 0) {
        return;
    }
    try {
        if (!globalShortcut.register(accelerator, handler)) {
            ElectronLog.warn(`Shortcut ${name}: "${accelerator}" is already taken by the OS or another app.`);
            unavailable.push(name);
        }
    } catch (error) {
        ElectronLog.warn(`Shortcut ${name}: "${accelerator}" is not a valid accelerator.`, error);
        unavailable.push(name);
    }
}

export function loadShortcuts() {
    globalShortcut.unregisterAll();
    unavailable = [];

    const shortcuts = settings.get("shortcuts");

    registerShortcut("mute_toggle", shortcuts?.mute_toggle, emitMuteToggle);
    registerShortcut("camera_toggle", shortcuts?.camera_toggle, emitCameraToggle);
    registerShortcut("companion_toggle", shortcuts?.companion_toggle, toggleCompanion);
}

export function getUnavailableShortcuts(): ShortcutName[] {
    return unavailable;
}

export function onShortcutsChange(listener: () => void) {
    listeners.add(listener);
}

export function saveShortcut(shortcut: keyof SettingsData["shortcuts"], key: string) {
    const shortcuts = settings.get("shortcuts") || <SettingsData["shortcuts"]>{};
    shortcuts[shortcut] = key;
    settings.set("shortcuts_edited", true);
    settings.set("shortcuts", shortcuts);
    loadShortcuts();
    listeners.forEach((listener) => listener());
}
