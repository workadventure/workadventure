import { get, writable } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { gameManager } from "../Phaser/Game/GameManager";
import type { BeforeInstallPromptEvent } from "../../types/pwa-install";
import {
    detectIos,
    hasPwaPromptAlreadyBeenShown,
    isStandalonePwa,
    markPwaPromptNeverShow,
} from "../Utils/PwaInstallEligibility";

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
let eligibilityListenerCleanup: (() => void) | undefined;
let shouldBypassPwaInstall = false;

function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
    return "prompt" in event && "userChoice" in event;
}

function saveDeferredPromptFromEvent(event: Event): void {
    if (!isBeforeInstallPromptEvent(event)) return;
    event.preventDefault();
    window.__workadventureDeferredPwaPrompt = event;
}

function isPwaInstallBlocked(): boolean {
    if (typeof window === "undefined") return true;
    if (shouldBypassPwaInstall) return true;
    if (isStandalonePwa()) return true;
    if (hasPwaPromptAlreadyBeenShown()) return true;
    return false;
}

function shouldExposePwaInstallForProfileMenu(): boolean {
    if (isPwaInstallBlocked()) return false;
    if (detectIos()) return true;
    return Boolean(window.__workadventureDeferredPwaPrompt);
}

function syncProfileMenuEligibility(): void {
    pwaInstallProfileMenuEligibleStore.set(shouldExposePwaInstallForProfileMenu());
}

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
    const onBeforeInstall = (event: Event) => {
        saveDeferredPromptFromEvent(event);
        syncFromWindow();
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
}

export function initPwaInstallProfileMenuEligibilityListener(options?: { bypassPwa?: boolean }): void {
    shouldBypassPwaInstall = options?.bypassPwa ?? false;
    syncProfileMenuEligibility();
    if (typeof window === "undefined" || eligibilityListenerCleanup) return;

    const onBeforeInstall = (event: Event) => {
        if (!isPwaInstallBlocked()) saveDeferredPromptFromEvent(event);
        syncFromWindow();
        syncProfileMenuEligibility();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    eligibilityListenerCleanup = () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        eligibilityListenerCleanup = undefined;
    };
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
    pwaInstallProfileMenuEligibleStore.set(false);
    gameManager.completePwaInstall();
}

/** True while the Phaser PwaInstallScene is active (Svelte full-screen UI). */
export const pwaInstallSceneVisibleStore = writable(false);

/**
 * Result of `shouldShowPwaInstallSceneAsync` during GameManager.init (single call per load).
 * `undefined` until init reaches that step; `false` when install is not offered (e.g. already installed).
 */
export const pwaInstallProfileMenuEligibleStore = writable<boolean | undefined>(undefined);
