import type { BeforeInstallPromptEvent } from "../../types/pwa-install";
import { localUserStore } from "../Connection/LocalUserStore";
import { pwaInstallProfileMenuEligibleStore } from "../Stores/PwaInstallStore";

export function isStandalonePwa(): boolean {
    if (typeof window === "undefined") return false;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true ||
        document.referrer.includes("android-app://")
    );
}

export function hasPwaPromptAlreadyBeenShown(): boolean {
    return localUserStore.hasPwaInstallPromptBeenShown();
}

export function markPwaPromptNeverShow(): void {
    localUserStore.setPwaInstallPromptShown();
}

export function detectIos(): boolean {
    if (typeof navigator === "undefined") return false;
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
}

export type ShouldShowPwaInstallOptions = {
    /** When true (admin / map API `bypassPwa`), never show the Web App install flow. */
    bypassPwa?: boolean;
};

/**
 * Whether to navigate to PwaInstallScene before entering the map (same rules as the legacy overlay).
 */
export async function shouldShowPwaInstallSceneAsync(options?: ShouldShowPwaInstallOptions): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (options?.bypassPwa) return false;
    if (isStandalonePwa()) return false;
    if (hasPwaPromptAlreadyBeenShown()) return false;
    if (window.__workadventureDeferredPwaPrompt || detectIos()) return true;

    return new Promise((resolve) => {
        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            window.__workadventureDeferredPwaPrompt = e as BeforeInstallPromptEvent;
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
            pwaInstallProfileMenuEligibleStore.set(true);
            resolve(true);
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstall);
    });
}
