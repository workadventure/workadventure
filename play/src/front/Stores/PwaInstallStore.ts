import { get, writable } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { gameManager } from "../Phaser/Game/GameManager";
import type { BeforeInstallPromptEvent } from "../../types/pwa-install";
import { detectIos, markPwaPromptNeverShow } from "../Utils/PwaInstallEligibility";

interface PwaInstallUiState {
    deferredPrompt: BeforeInstallPromptEvent | null;
    isIos: boolean;
    installing: boolean;
}

const initial: PwaInstallUiState = {
    deferredPrompt: null,
    isIos: false,
    installing: false,
};

const store = writable<PwaInstallUiState>(initial);

function syncFromWindow(): void {
    store.update((state) => ({
        ...state,
        deferredPrompt: typeof window !== "undefined" ? window.__workadventureDeferredPwaPrompt ?? null : null,
        isIos: detectIos(),
    }));
}

export const pwaInstallUiStore = {
    subscribe: store.subscribe,
};

/** Sync deferred install prompt from `window` and listen for `beforeinstallprompt`. Call from PwaInstallScreen `onMount`. */
export function initPwaInstallUiListeners(): () => void {
    syncFromWindow();
    const onBeforeInstall = (e: Event) => {
        e.preventDefault();
        window.__workadventureDeferredPwaPrompt = e as BeforeInstallPromptEvent;
        syncFromWindow();
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
}

export async function installPwaFromStore(): Promise<void> {
    const state = get(store);
    if (!state.deferredPrompt) return;

    analyticsClient.pwaInstallClick();
    store.update((s) => ({ ...s, installing: true }));
    try {
        await state.deferredPrompt.prompt();
        const { outcome } = await state.deferredPrompt.userChoice;
        analyticsClient.pwaInstallOutcome(outcome);
        if (outcome === "accepted") {
            window.__workadventureDeferredPwaPrompt = null;
            store.update((s) => ({ ...s, deferredPrompt: null }));
        }
    } finally {
        store.update((s) => ({ ...s, installing: false }));
    }
    gameManager.completePwaInstall();
}

export function continuePwaInBrowser(): void {
    analyticsClient.pwaContinueInBrowserClick();
    gameManager.completePwaInstall();
}

export function neverShowPwaPage(): void {
    markPwaPromptNeverShow();
    gameManager.completePwaInstall();
}

/** True while the Phaser PwaInstallScene is active (Svelte full-screen UI). */
export const pwaInstallSceneVisibleStore = writable(false);
