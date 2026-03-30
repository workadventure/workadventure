/**
 * Web app install prompt event (`beforeinstallprompt`, non-standard, Chrome/Edge).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event
 */
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    prompt(): Promise<void>;
}

declare global {
    interface Window {
        __workadventureDeferredPwaPrompt: BeforeInstallPromptEvent | null;
    }
}

export type { BeforeInstallPromptEvent };
