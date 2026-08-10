import { globalShortcut } from "electron";
import ElectronLog from "electron-log";
import settings, { SettingsData } from "./settings";
import { emitCameraToggle, emitMuteToggle } from "./ipc";
import { toggleCompanion } from "./companion-controller";

export function setShortcutsEnabled(enabled: boolean) {
    if (enabled) {
        loadShortcuts();
    } else {
        globalShortcut.unregisterAll();
    }
}

/**
 * Register one global accelerator, tolerating both failure modes Electron has here: `register`
 * returns false when the OS or another app already owns the combo, and it throws outright on a
 * malformed accelerator string (which a hand-edited settings file can produce). Either way the
 * shortcut silently would not fire, so log it — an unbound mute key is otherwise indistinguishable
 * from a broken one.
 */
function registerShortcut(label: string, accelerator: string | undefined, handler: () => void): void {
    if (!accelerator || accelerator.length === 0) {
        return;
    }
    try {
        if (!globalShortcut.register(accelerator, handler)) {
            ElectronLog.warn(`Shortcut ${label}: "${accelerator}" is already taken by the OS or another app.`);
        }
    } catch (error) {
        ElectronLog.warn(`Shortcut ${label}: "${accelerator}" is not a valid accelerator.`, error);
    }
}

export function loadShortcuts() {
    globalShortcut.unregisterAll();

    const shortcuts = settings.get("shortcuts");

    registerShortcut("mute_toggle", shortcuts?.mute_toggle, emitMuteToggle);
    registerShortcut("camera_toggle", shortcuts?.camera_toggle, emitCameraToggle);
    registerShortcut("companion_toggle", shortcuts?.companion_toggle, toggleCompanion);
}

export function saveShortcut(shortcut: keyof SettingsData["shortcuts"], key: string) {
    const shortcuts = settings.get("shortcuts") || <SettingsData["shortcuts"]>{};
    shortcuts[shortcut] = key;
    settings.set("shortcuts", shortcuts);
    loadShortcuts();
}
