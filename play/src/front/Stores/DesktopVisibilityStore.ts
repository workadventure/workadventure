import { derived, readable } from "svelte/store";
import type { DesktopWindowState } from "../Interfaces/DesktopAppInterfaces";
import { visibilityStore } from "./VisibilityStore";
import { isUserAwayFromApp } from "./DesktopVisibilityPolicy";

const desktopWindowStateStore = readable<DesktopWindowState | undefined>(undefined, (set) => {
    if (!window.WAD?.getWindowState || !window.WAD?.onWindowStateChange) {
        return;
    }

    let active = true;
    window.WAD.getWindowState()
        .then((state) => {
            if (active) {
                set(state);
            }
        })
        .catch((error) => console.warn("Unable to read desktop window state", error));

    const unsubscribe = window.WAD.onWindowStateChange((state) => set(state));

    return () => {
        active = false;
        unsubscribe();
    };
});

export const userAwayFromAppStore = derived([visibilityStore, desktopWindowStateStore], ([$visible, $desktopState]) =>
    isUserAwayFromApp($visible, $desktopState),
);
